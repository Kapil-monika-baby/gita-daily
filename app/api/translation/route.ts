import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedLanguages = new Set([
  "hi", "mr", "gu", "bn", "ta", "te", "kn", "ml", "pa", "or", "as", "ur",
  "ne", "fr", "de", "es", "pt", "it", "ru", "ja", "ko", "zh", "ar", "id", "th",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verseId = url.searchParams.get("verseId");
  const language = (url.searchParams.get("language") || "en").toLowerCase();

  if (!verseId) return jsonError("verseId is required", 400);
  if (language !== "en" && !supportedLanguages.has(language)) {
    return jsonError("Unsupported language", 400);
  }

  const supabase = await createClient();

  if (language === "en") {
    const { data, error } = await supabase
      .from("verse_meanings")
      .select("language,meaning")
      .eq("verse_id", verseId)
      .eq("language", "en")
      .eq("review_status", "approved")
      .maybeSingle();

    if (error) return jsonError("Unable to load the English meaning", 500);
    return NextResponse.json({ translation: data ? { ...data, status: "master" } : null });
  }

  // Older Argos rows were labelled approved without meaningful editorial review.
  const { data: reviewed, error: reviewedError } = await supabase
    .from("translations")
    .select("language,meaning,model")
    .eq("verse_id", verseId)
    .eq("language", language)
    .eq("review_status", "approved")
    .maybeSingle();

  if (reviewedError) return jsonError("Unable to load the reviewed translation", 500);
  if (reviewed && reviewed.model !== "argos-translate") {
    return NextResponse.json({
      translation: { language: reviewed.language, meaning: reviewed.meaning, status: "reviewed" },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;
  if (!supabaseUrl || !supabaseSecret || !googleKey) {
    return jsonError("On-demand translation is not configured yet. Please try again later.", 503);
  }

  const admin = createSupabaseClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: cached, error: cacheError } = await admin
    .from("translation_runtime_cache")
    .select("language,meaning,status,provider")
    .eq("verse_id", verseId)
    .eq("language", language)
    .maybeSingle();

  if (cacheError) {
    return jsonError("Translation cache is not ready. Apply the Supabase migration first.", 503);
  }
  if (cached) return NextResponse.json({ translation: cached });

  const { data: verse, error: verseError } = await admin
    .from("verses")
    .select("id,chapter,verse")
    .eq("id", verseId)
    .maybeSingle();
  if (verseError || !verse) return jsonError("Verse not found", 404);

  const { data: master, error: masterError } = await admin
    .from("verse_meanings")
    .select("meaning")
    .eq("verse_id", verseId)
    .eq("language", "en")
    .eq("review_status", "approved")
    .maybeSingle();
  if (masterError || !master?.meaning) {
    return jsonError("No approved English master meaning is available for this verse.", 422);
  }

  const targetLanguage = language === "zh" ? "zh-CN" : language;
  const translateResponse = await fetch(
    "https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(googleKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: master.meaning, source: "en", target: targetLanguage, format: "text" }),
      cache: "no-store",
    },
  );
  if (!translateResponse.ok) return jsonError("The translation service is temporarily unavailable.", 502);

  const translatePayload = await translateResponse.json();
  const translatedMeaning = translatePayload?.data?.translations?.[0]?.translatedText;
  if (typeof translatedMeaning !== "string" || !translatedMeaning.trim()) {
    return jsonError("The translation service returned no text.", 502);
  }

  const { error: saveError } = await admin.from("translation_runtime_cache").upsert({
    verse_id: verseId,
    language,
    meaning: translatedMeaning,
    provider: "google-cloud-translation",
    status: "ai_generated_unverified",
    updated_at: new Date().toISOString(),
  }, { onConflict: "verse_id,language" });

  if (saveError) return jsonError("Translation generated but could not be cached. Apply the Supabase migration.", 503);

  return NextResponse.json({
    translation: {
      language,
      meaning: translatedMeaning,
      status: "ai_generated_unverified",
      provider: "google-cloud-translation",
    },
  });
}

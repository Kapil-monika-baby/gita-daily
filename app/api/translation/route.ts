import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verseId = url.searchParams.get("verseId");
  const language = url.searchParams.get("language") || "en";

  if (!verseId) {
    return NextResponse.json({ error: "verseId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // The approved English master meanings live in verse_meanings.
  // Imported translations remain visible even before review; the UI labels their status.
  if (language === "en") {
    const { data, error } = await supabase
      .from("verse_meanings")
      .select("language,meaning")
      .eq("verse_id", verseId)
      .eq("language", "en")
      .eq("review_status", "approved")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ translation: data ?? null });
  }

  const { data, error } = await supabase
    .from("translations")
    .select("language,meaning,review_status")
    .eq("verse_id", verseId)
    .eq("language", language)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ translation: data ?? null });
}

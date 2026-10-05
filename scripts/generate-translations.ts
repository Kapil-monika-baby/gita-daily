import { TranslationServiceClient } from "@google-cloud/translate";
import { createClient } from "@supabase/supabase-js";

const targets = ["hi","mr","gu","bn","ta","te","kn","ml","pa","or","as","ur","ne","fr","de","es","pt","it","ru","ja","ko","zh","ar","id","th"];
const [,, requestedLanguage] = process.argv;
const chapterArg = process.argv.find((a) => a.startsWith("--chapter="))?.split("=")[1];
const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
const language = requestedLanguage && !requestedLanguage.startsWith("--") ? requestedLanguage : undefined;
const chapter = chapterArg ? Number(chapterArg) : undefined;
const limit = limitArg ? Number(limitArg) : undefined;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_LOCATION ?? "global";

if (!supabaseUrl || !serviceKey || !projectId) {
  throw new Error("Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLOUD_PROJECT_ID");
}
if (language && language !== "all" && !targets.includes(language)) {
  throw new Error(`Unsupported language: ${language}. Supported: ${targets.join(", ")}`);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const client = new TranslationServiceClient();

async function main() {
  const languages = !language || language === "all" ? targets : [language];
  let query = supabase
    .from("verse_meanings")
    .select("verse_id,meaning,verses!inner(chapter,verse)")
    .eq("language","en")
    .eq("version","v1")
    .eq("review_status","approved")
    .order("chapter", { referencedTable: "verses" })
    .order("verse", { referencedTable: "verses" });
  if (chapter) query = query.eq("verses.chapter", chapter);
  const { data: masters, error } = await query;
  if (error) throw error;
  const source = (masters ?? []).slice(0, limit);
  if (!source.length) throw new Error("No approved English master meanings matched the request.");

  console.log(`Generating ${source.length} meanings × ${languages.length} languages`);

  for (const target of languages) {
    const { data: existing } = await supabase
      .from("translations")
      .select("verse_id")
      .eq("language", target)
      .in("verse_id", source.map((x: any) => x.verse_id));
    const existingIds = new Set((existing ?? []).map((x: any) => x.verse_id));
    const pending = source.filter((x: any) => !existingIds.has(x.verse_id));

    const { data: job, error: jobError } = await supabase
      .from("translation_jobs")
      .insert({ source_language: "en", target_language: target, total_items: pending.length, generated_items: 0, approved_items: 0, flagged_items: 0, status: "running" })
      .select("id")
      .single();
    if (jobError) throw jobError;

    let generated = 0;
    let flagged = 0;

    for (let i = 0; i < pending.length; i += 50) {
      const batch = pending.slice(i, i + 50);
      const parent = `projects/${projectId}/locations/${location}`;
      const [response] = await client.translateText({
        parent,
        sourceLanguageCode: "en",
        targetLanguageCode: target,
        contents: batch.map((x: any) => x.meaning),
        mimeType: "text/plain",
      });

      const rows = batch.map((item: any, index: number) => {
        const meaning = response.translations?.[index]?.translatedText?.trim() ?? "";
        const sourceLength = item.meaning.length;
        const ratio = sourceLength ? meaning.length / sourceLength : 0;
        const suspicious = !meaning || ratio < 0.35 || ratio > 3.5;
        if (suspicious) flagged++;
        return {
          verse_id: item.verse_id,
          language: target,
          meaning,
          model: "google-cloud-translation",
          version: "v1-google",
          source_language: "en",
          review_status: "pending",
          generated_at: new Date().toISOString(),
          quality_score: suspicious ? 50 : 90,
          review_note: suspicious ? "Flagged by automated length/empty-output validation." : "Passed automated generation checks; pending review.",
        };
      });

      const { error: upsertError } = await supabase
        .from("translations")
        .upsert(rows, { onConflict: "verse_id,language" });
      if (upsertError) throw upsertError;

      generated += rows.length;
      await supabase.from("translation_jobs").update({ generated_items: generated, flagged_items: flagged, updated_at: new Date().toISOString() }).eq("id", job.id);
      console.log(`${target}: ${generated}/${pending.length}`);
    }

    await supabase.from("translation_jobs").update({ generated_items: generated, flagged_items: flagged, status: "completed", updated_at: new Date().toISOString() }).eq("id", job.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

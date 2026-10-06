import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Required env: SUPABASE_URL and SUPABASE_SECRET_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const languageArg = process.argv.find((a) => a.startsWith("--language="))?.split("=")[1];

async function main() {
  let q = supabase.from("translations").select("id,verse_id,language,meaning,review_status,quality_score");
  if (languageArg) q = q.eq("language", languageArg);
  const { data, error } = await q;
  if (error) throw error;

  const flagged = (data ?? []).filter((row: any) => {
    const text = (row.meaning ?? "").trim();
    return !text || text.length < 20 || Number(row.quality_score ?? 0) < 70;
  });

  console.log(JSON.stringify({
    checked: data?.length ?? 0,
    flagged: flagged.length,
    approved: (data ?? []).filter((r: any) => r.review_status === "approved").length,
    pending: (data ?? []).filter((r: any) => r.review_status === "pending").length
  }, null, 2));

  if (flagged.length) {
    console.log("Flagged IDs:", flagged.slice(0, 25).map((r: any) => r.id));
    process.exitCode = 2;
  }
}

main().catch((error) => { console.error(error); process.exit(1); });

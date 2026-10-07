import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const languages = ["hi","mr","gu","bn","ta","te","kn","ml","pa","or","as","ur","ne","fr","de","es","pt","it","ru","ja","ko","zh","ar","id","th"];

async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes((user.email ?? "").toLowerCase())) {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return { error: NextResponse.json({ error: "SUPABASE_SECRET_KEY is not configured on the server." }, { status: 500 }) };
  return { client: createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const language = url.searchParams.get("language") || "mr";
  const status = url.searchParams.get("status") || "pending";
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  if (!languages.includes(language)) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  if (!["pending","approved","rejected"].includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const { data, error } = await gate.client
    .from("translations")
    .select("id,verse_id,language,meaning,review_status,quality_score,review_note,generated_at,reviewed_at,verses(chapter,verse,sanskrit,transliteration)")
    .eq("language", language)
    .eq("review_status", status)
    .order("verse_id")
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ translations: data ?? [] });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = await request.json();
  const { id, status, meaning, review_note } = body ?? {};
  if (!id || !["pending","approved","rejected"].includes(status)) {
    return NextResponse.json({ error: "id and valid status are required." }, { status: 400 });
  }
  const update: Record<string, unknown> = {
    review_status: status,
    reviewed_at: new Date().toISOString(),
    review_note: typeof review_note === "string" ? review_note : null,
  };
  if (typeof meaning === "string" && meaning.trim()) update.meaning = meaning.trim();

  const { data, error } = await gate.client.from("translations").update(update).eq("id", id).select("id,review_status,meaning,reviewed_at,review_note").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ translation: data });
}

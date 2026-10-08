import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chapterParam = url.searchParams.get("chapter");
  const chapter = chapterParam ? Number(chapterParam) : null;

  const supabase = await createClient();
  let query = supabase
    .from("verses")
    .select("id,chapter,verse,sanskrit,transliteration")
    .order("chapter")
    .order("verse");

  if (chapter !== null) {
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 18) {
      return NextResponse.json({ error: "chapter must be between 1 and 18" }, { status: 400 });
    }
    query = query.eq("chapter", chapter);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ verses: data ?? [] });
}

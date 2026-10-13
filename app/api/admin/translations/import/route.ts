import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supportedLanguages = new Set([
  "hi", "bn", "mr", "gu", "ta", "te", "kn", "ml", "pa", "or",
  "es", "fr", "de", "pt", "ru", "ar", "zh", "ja", "id", "it", "ko",
]);

async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes((user.email ?? "").toLowerCase())) {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    return { error: NextResponse.json({ error: "SUPABASE_SECRET_KEY is not configured on the server." }, { status: 500 }) };
  }

  return {
    client: createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
  };
}

// RFC 4180-style parser: preserves commas, quotes, and line breaks inside quoted cells.
function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.length === 0) {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted cell.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(value => value.length > 0)) rows.push(row);
  }
  return rows;
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose the prepared Google Translate CSV file first." }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "The CSV is larger than the 12 MB import limit." }, { status: 413 });
    }

    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      return NextResponse.json({ error: "The CSV is empty." }, { status: 400 });
    }

    const headers = parsed[0].map(value => value.trim());
    const required = ["chapter", "verse", "language", "meaning", "source_workbook_verse"];
    const index = Object.fromEntries(headers.map((header, i) => [header, i]));
    const missing = required.filter(header => index[header] === undefined);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required CSV columns: ${missing.join(", ")}` }, { status: 400 });
    }

    const records = parsed.slice(1).map((cells, i) => {
      const value = (key: string) => (cells[index[key]] ?? "").trim();
      const chapter = Number(value("chapter"));
      const verse = Number(value("verse"));
      const language = value("language");
      const meaning = value("meaning");
      if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) {
        throw new Error(`Invalid chapter/verse on CSV data row ${i + 2}.`);
      }
      if (!supportedLanguages.has(language)) {
        throw new Error(`Unsupported language code "${language}" on CSV data row ${i + 2}.`);
      }
      if (!meaning) throw new Error(`Empty translation on CSV data row ${i + 2}.`);
      return { chapter, verse, language, meaning };
    });

    const keys = new Set<string>();
    for (const record of records) {
      const key = `${record.chapter}.${record.verse}:${record.language}`;
      if (keys.has(key)) throw new Error(`Duplicate verse/language pair: ${key}`);
      keys.add(key);
    }

    const expected = 700 * 21;
    if (records.length !== expected) {
      return NextResponse.json({
        error: `Expected ${expected.toLocaleString()} entries (700 verses × 21 languages), but found ${records.length.toLocaleString()}. Nothing was imported.`,
      }, { status: 400 });
    }

    const { data: verseRows, error: verseError } = await gate.client
      .from("verses").select("id,chapter,verse").limit(1000);
    if (verseError) throw new Error(verseError.message);
    const verseIds = new Map((verseRows ?? []).map(v => [`${v.chapter}.${v.verse}`, v.id]));
    if (verseIds.size !== 700) throw new Error(`Expected 700 app verses; found ${verseIds.size}. Nothing was imported.`);

    const mapped = records.map(record => {
      const verseId = verseIds.get(`${record.chapter}.${record.verse}`);
      if (!verseId) throw new Error(`App verse ${record.chapter}.${record.verse} was not found. Nothing was imported.`);
      return {
        verse_id: verseId,
        language: record.language,
        meaning: record.meaning,
        model: "google-translate-sheets-2026-10",
        version: "google-sheets-2026-10",
        review_status: "pending",
        reviewed_at: null,
        quality_score: null,
        review_note: "Imported from user's Google Translate workbook; review before public display.",
        source_language: "en",
      };
    });

    // Never silently demote or replace an already-approved translation.
    const approved = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await gate.client
        .from("translations")
        .select("verse_id,language,model")
        .eq("review_status", "approved")
        .in("language", [...supportedLanguages])
        .order("verse_id")
        .order("language")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        // Earlier Argos-generated rows were machine translations, not human-reviewed approvals.
        // Allow the Google Translate workbook to replace those as pending drafts for review.
        if (row.model !== "argos-translate") approved.add(`${row.verse_id}:${row.language}`);
      }
      if (!data || data.length < 1000) break;
    }

    const toWrite = mapped.filter(row => !approved.has(`${row.verse_id}:${row.language}`));
    let written = 0;
    for (let i = 0; i < toWrite.length; i += 750) {
      const batch = toWrite.slice(i, i + 750);
      const { error } = await gate.client
        .from("translations")
        .upsert(batch, { onConflict: "verse_id,language" });
      if (error) throw new Error(`Import stopped after ${written} entries: ${error.message}`);
      written += batch.length;
    }

    return NextResponse.json({
      success: true,
      entries_in_file: records.length,
      imported_or_refreshed_as_pending: written,
      approved_entries_preserved: mapped.length - toWrite.length,
      languages: supportedLanguages.size,
      note: "Imported translations remain pending and are not shown publicly until approved.",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Import failed.",
    }, { status: 400 });
  }
}

#!/usr/bin/env python3
"""
Import missing English master meanings from a public-domain Bhagavad Gita edition.

Primary source:
ChiragMirani/gita-quotes, which identifies Shri Purohit Swami (1935)
as the primary public-domain translator and Swami Sivananda as fallback.
This script only fills missing English master meanings; existing v1 masters
are never overwritten.
"""
import json
import os
import urllib.parse
import urllib.request

SOURCE_URL = "https://chiragmirani.github.io/gita-quotes/data.json"
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("Required env: SUPABASE_URL and SUPABASE_SECRET_KEY")

def api(method, path, payload=None, params=None):
    query = ("?" + urllib.parse.urlencode(params, doseq=True)) if params else ""
    req = urllib.request.Request(
        SUPABASE_URL.rstrip("/") + "/rest/v1/" + path + query,
        method=method,
        headers={
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        data=json.dumps(payload).encode() if payload is not None else None,
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else []

def main():
    print("Downloading public-domain English master dataset...")
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
        source = json.loads(response.read().decode())

    verses = api("GET", "verses", params={
        "select": "id,chapter,verse",
        "limit": "1000",
    })
    verse_map = {(v["chapter"], v["verse"]): v["id"] for v in verses}

    existing = api("GET", "verse_meanings", params={
        "select": "verse_id",
        "language": "eq.en",
        "version": "eq.v1",
        "limit": "1000",
    })
    existing_ids = {r["verse_id"] for r in existing}

    rows = []
    skipped = 0
    for item in source.get("verses", []):
        key = (item.get("chapter"), item.get("verse"))
        verse_id = verse_map.get(key)
        if not verse_id or verse_id in existing_ids:
            skipped += 1
            continue

        meaning = (item.get("english") or "").strip()
        if not meaning or meaning.lower() == "no changes needed.":
            meaning = (item.get("english_alt") or "").strip()
        if not meaning:
            skipped += 1
            continue

        # Remove the leading chapter.verse label because our verse metadata
        # already supplies chapter/verse separately.
        prefix = f"{item.get('chapter')}.{item.get('verse')} "
        if meaning.startswith(prefix):
            meaning = meaning[len(prefix):].strip()

        rows.append({
            "verse_id": verse_id,
            "language": "en",
            "meaning": meaning,
            "source": "Shri Purohit Swami (1935, public domain)",
            "version": "v1",
            "review_status": "approved",
        })

    print(f"Found {len(rows)} missing English masters; skipped {skipped} existing/unmatched rows.")

    for start in range(0, len(rows), 50):
        batch = rows[start:start + 50]
        api("POST", "verse_meanings", batch)
        print(f"Imported {min(start + 50, len(rows))}/{len(rows)}")

    print("English master import complete.")

if __name__ == "__main__":
    main()

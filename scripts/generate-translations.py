#!/usr/bin/env python3
"""
Free Gita translation generator.

Uses Argos Translate, an open-source offline translation engine.
No Google Cloud, API key, or billing account is required.

Usage:
  python scripts/generate-translations.py hi --chapter=1
  python scripts/generate-translations.py fr
  python scripts/generate-translations.py all --chapter=1
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import argostranslate.package
import argostranslate.translate

TARGETS = [
    "hi","mr","gu","bn","ta","te","kn","ml","pa","or","as","ur","ne",
    "fr","de","es","pt","it","ru","ja","ko","zh","ar","id","th"
]

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    raise SystemExit("Required env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

args = [a for a in sys.argv[1:] if a]
language = next((a for a in args if not a.startswith("--")), "hi")
chapter_arg = next((a.split("=",1)[1] for a in args if a.startswith("--chapter=")), None)
limit_arg = next((a.split("=",1)[1] for a in args if a.startswith("--limit=")), None)
chapter = int(chapter_arg) if chapter_arg else None
limit = int(limit_arg) if limit_arg else None

if language != "all" and language not in TARGETS:
    raise SystemExit(f"Unsupported language: {language}. Supported: {', '.join(TARGETS)}")

def api(method, path, payload=None, params=None):
    query = ("?" + urllib.parse.urlencode(params, doseq=True)) if params else ""
    req = urllib.request.Request(
        url.rstrip("/") + "/rest/v1/" + path + query,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        data=json.dumps(payload).encode() if payload is not None else None,
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else []

def get_masters():
    rows = api(
        "GET",
        "verse_meanings",
        params={
            "select": "verse_id,meaning,verses(chapter,verse)",
            "language": "eq.en",
            "version": "eq.v1",
            "review_status": "eq.approved",
            "limit": "1000",
        },
    )
    rows = [r for r in rows if r.get("verses")]
    rows.sort(key=lambda r: (r["verses"]["chapter"], r["verses"]["verse"]))
    if chapter:
        rows = [r for r in rows if r["verses"]["chapter"] == chapter]
    if limit:
        rows = rows[:limit]
    if not rows:
        raise SystemExit("No approved English master meanings matched the request.")
    return rows

def ensure_package(target):
    available = argostranslate.package.get_available_packages()
    direct = next((p for p in available if p.from_code == "en" and p.to_code == target), None)
    if direct:
        print(f"Installing/refreshing Argos model en->{target}...")
        argostranslate.package.install_from_path(direct.download())
        return True
    print(f"No direct Argos model found for en->{target}; skipping this language.")
    return False

def translator_for(target):
    installed = argostranslate.translate.get_installed_languages()
    source = next((x for x in installed if x.code == "en"), None)
    dest = next((x for x in installed if x.code == target), None)
    if not source or not dest:
        return None
    try:
        return source.get_translation(dest)
    except Exception:
        return None

def main():
    masters = get_masters()
    languages = TARGETS if language == "all" else [language]
    print(f"Generating {len(masters)} meanings x {len(languages)} requested languages")

    for target in languages:
        if not ensure_package(target):
            continue
        translator = translator_for(target)
        if translator is None:
            print(f"Could not initialize en->{target}; skipping.")
            continue

        existing = api(
            "GET",
            "translations",
            params={"select": "verse_id", "language": f"eq.{target}", "limit": "1000"},
        )
        existing_ids = {r["verse_id"] for r in existing}
        pending = [r for r in masters if r["verse_id"] not in existing_ids]
        if not pending:
            print(f"{target}: already complete for requested scope.")
            continue

        job = api("POST", "translation_jobs", {
            "source_language": "en",
            "target_language": target,
            "total_items": len(pending),
            "generated_items": 0,
            "approved_items": 0,
            "flagged_items": 0,
            "status": "running",
        })[0]
        job_id = job["id"]

        generated = 0
        flagged = 0
        for i, item in enumerate(pending, 1):
            meaning = translator.translate(item["meaning"]).strip()
            source_len = len(item["meaning"])
            ratio = len(meaning) / source_len if source_len else 0
            suspicious = (not meaning) or ratio < 0.30 or ratio > 3.5
            score = 55 if suspicious else 75
            note = (
                "Flagged by automated output checks; human review required."
                if suspicious
                else "Generated by Argos Translate; human review required."
            )
            row = {
                "verse_id": item["verse_id"],
                "language": target,
                "meaning": meaning,
                "model": "argos-translate",
                "version": "v1-argos",
                "source_language": "en",
                "review_status": "pending",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "quality_score": score,
                "review_note": note,
            }
            api("POST", "translations", [row])
            generated += 1
            flagged += int(suspicious)
            if i % 10 == 0 or i == len(pending):
                api("PATCH", f"translation_jobs?id=eq.{urllib.parse.quote(job_id)}", {
                    "generated_items": generated,
                    "flagged_items": flagged,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
                print(f"{target}: {generated}/{len(pending)}")

        api("PATCH", f"translation_jobs?id=eq.{urllib.parse.quote(job_id)}", {
            "generated_items": generated,
            "flagged_items": flagged,
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

if __name__ == "__main__":
    main()

# Translation Pipeline

Gita Daily never translates at reading time.

## Pipeline

1. Maintain one English master meaning per normalized verse in `verse_meanings`.
2. Keep master meanings `draft` until reviewed.
3. Once approved, run:
   `npm run translations:generate -- hi`
4. Google Cloud Translation converts the approved English master into the target language.
5. Generated rows enter `translations` as `pending`.
6. Only rows marked `approved` are readable by the public app.
7. The mobile app can pre-download approved translations for offline reading.

## Required secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never ship to the app)
- `GOOGLE_CLOUD_PROJECT_ID`
- Google Application Default Credentials / service account

## Important

Google is the translation engine, not the theological authority. The English master is the controlled source meaning, and machine translations require review before publication.

## Review strategy

Do not manually inspect every generated translation. First validate automatically for missing output, suspicious length, untranslated fragments, and glossary-sensitive terms. Then review flagged rows and spot-check a sample of the remaining rows before bulk approval.

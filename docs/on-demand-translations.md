# On-demand translations

## Behaviour

- English continues to use the existing approved English master meaning.
- A non-English language first uses a reviewed translation when one exists.
- The legacy `argos-translate` rows are not treated as verified, even where their old status says `approved`.
- If no reviewed translation exists, the server translates the approved English master meaning with Google Cloud Translation.
- Generated translations are cached in `translation_runtime_cache`, separate from the existing editorial translation tables.
- Generated results are returned with status `ai_generated_unverified` and must not be represented as expert-reviewed scripture translations.

This translates the English meaning, not the Sanskrit directly. The Sanskrit verse and transliteration remain unchanged.

## Setup

1. In Google Cloud, enable the Cloud Translation API and create an API key. Restrict the key to the Cloud Translation API and set a quota/budget alert.
2. In Vercel project settings, add the server-only environment variable `GOOGLE_CLOUD_TRANSLATE_API_KEY`. Do not use a `NEXT_PUBLIC_` prefix.
3. Ensure `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) is configured as a server-only Vercel environment variable.
4. Apply `supabase/migrations/20261009000000_translation_runtime_cache.sql` in the Supabase SQL Editor.
5. Redeploy the application after setting the environment variable and applying the migration.

The migration enables RLS and deliberately adds no public policies. Only the server-side secret-key client should read/write the runtime cache.

## Manual QA

- English: reveal a meaning; it should return the English master meaning.
- Hindi: reveal a meaning; the first request should return a generated result with the unverified label, then subsequent requests should use the cache.
- A language with a non-Argos reviewed translation should display the reviewed result.
- An unsupported language code should return HTTP 400.
- Before setup, a missing API key or cache table should show a helpful configuration message rather than a false verified result.

## Accuracy and cost safeguards

- Translation is on-demand when the reader requests a meaning, not automatically for every page visit.
- The supported languages are limited to those in the app's language selector.
- Cache entries are separate from approved editorial translations; runtime-generated results never change the approval status of the editorial tables.
- A machine-translation service is not a Sanskrit scholar. The app must label runtime translations as unverified. Review important or disputed verses against licensed/public-domain reference editions and qualified editorial review.
- Restrict the Google API key to Cloud Translation and configure usage quotas/budget alerts before production launch.

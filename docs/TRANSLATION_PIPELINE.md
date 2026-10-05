# Translation Pipeline

Gita Daily does not translate verses at reading time and does not depend on a paid translation API.

## Principles

1. The Sanskrit verse is the source scripture.
2. Gita Supersite (IIT Kanpur) and other reputable scholarly resources may be used for study, cross-checking, and interpretation.
3. We do **not** copy or redistribute third-party translations unless their licensing explicitly permits commercial reuse. Gita Supersite states that copyrights of hosted books remain with their respective organisations.
4. Gita Daily creates its own original, reader-friendly meanings and translations.
5. Approved translations are stored in Supabase and served directly to the app.
6. No translation API or AI call is required when a user reads a verse.
7. Approved data can be bundled/pre-downloaded for offline reading.

## Translation workflow

1. Establish the normalized 700-verse Sanskrit dataset.
2. Create an original English master meaning for each verse, using the Sanskrit plus reputable references for cross-checking.
3. Review the English master for fidelity, omissions, and theological/contextual errors.
4. Create original translations from the approved English master, while checking the Sanskrit for important terms and context.
5. Run automated quality checks for empty output, suspicious length, untranslated fragments, script/language mismatch, and glossary-sensitive terms.
6. Store each result in `translations` as `pending`.
7. Review flagged rows and representative samples.
8. Mark only reviewed rows as `approved`.
9. The public app reads only approved rows.
10. Track source/version/review metadata so translations can be revised without losing history.

## Controlled terminology

Maintain Gita-specific glossary entries in `translation_glossary` for terms whose meaning should not be flattened into an ordinary word, such as:

- Dharma
- Karma
- Yoga
- Atman
- Brahman
- Prakriti
- Gunas
- Moksha
- Buddhi
- Jnana
- Bhakti
- Sannyasa

The glossary is a consistency aid, not a substitute for context.

## IIT Kanpur Gita Supersite

The Gita Supersite is useful as a scholarly reference and comparison source. It provides the Sanskrit text and multiple translations/commentaries, and its stated goal is to make Indian philosophical texts freely available online. However, its acknowledgement page explicitly says that copyrights of hosted books remain with the respective organisations. Therefore, for Gita Daily's commercial app, use it as a reference rather than copying its translations into our database.

## Current status

- Google Cloud Translation: removed.
- Google Cloud billing: not required.
- Translation API secrets: not required.
- English master table: `verse_meanings`.
- Localized translations: `translations`.
- Glossary: `translation_glossary`.
- Review/job tracking: `translation_jobs`.

-- Runtime-generated translations are cached separately from reviewed translations.
-- Apply this migration in Supabase before enabling on-demand translation.
create table if not exists public.translation_runtime_cache (
  verse_id uuid not null references public.verses(id) on delete cascade,
  language text not null,
  meaning text not null,
  provider text not null default 'google-cloud-translation',
  status text not null default 'ai_generated_unverified'
    check (status = 'ai_generated_unverified'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (verse_id, language)
);

alter table public.translation_runtime_cache enable row level security;
-- Intentionally no client-facing policies. Server access uses SUPABASE_SECRET_KEY.

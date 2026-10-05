create extension if not exists pgcrypto;

create table if not exists public.verses (
  id uuid primary key default gen_random_uuid(),
  chapter smallint not null,
  verse smallint not null,
  sanskrit text not null,
  transliteration text,
  source_name text,
  source_verse_id integer,
  canonical_scheme text not null default 'standard-700',
  created_at timestamptz not null default now(),
  unique(chapter, verse)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check(plan in ('free','plus')),
  status text not null default 'active' check(status in ('active','expired','refunded','billing_issue')),
  source text check(source in ('apple','google','lifetime','admin')),
  product_id text,
  provider_transaction_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  unique(source, provider_transaction_id)
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null check(platform in ('web','android','ios')),
  token text not null,
  enabled boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  times jsonb not null default '["08:00"]'::jsonb,
  verse_cursor integer not null default 0,
  next_send_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, token)
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  verse_id uuid not null references public.verses(id) on delete cascade,
  language text not null,
  meaning text not null,
  created_at timestamptz not null default now(),
  model text,
  version text not null default 'v1',
  review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  quality_score smallint check(quality_score between 0 and 100),
  review_note text,
  source_language text not null default 'en',
  unique(verse_id, language)
);

create table if not exists public.verse_meanings (
  id uuid primary key default gen_random_uuid(),
  verse_id uuid not null references public.verses(id) on delete cascade,
  language text not null default 'en',
  meaning text not null,
  source text,
  version text not null default 'v1',
  review_status text not null default 'draft' check(review_status in ('draft','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(verse_id, language, version)
);

create table if not exists public.translation_glossary (
  id uuid primary key default gen_random_uuid(),
  source_language text not null,
  target_language text not null,
  source_term text not null,
  target_term text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(source_language, target_language, source_term)
);

create table if not exists public.translation_jobs (
  id uuid primary key default gen_random_uuid(),
  source_language text not null default 'en',
  target_language text not null,
  total_items integer not null default 0,
  generated_items integer not null default 0,
  approved_items integer not null default 0,
  flagged_items integer not null default 0,
  status text not null default 'queued' check(status in ('queued','running','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_id uuid not null references public.verses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, verse_id)
);

alter table public.verses enable row level security;
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.notification_devices enable row level security;
alter table public.translations enable row level security;
alter table public.verse_meanings enable row level security;
alter table public.translation_glossary enable row level security;
alter table public.translation_jobs enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "public can read verses" on public.verses;
create policy "public can read verses" on public.verses for select to anon, authenticated using (true);

drop policy if exists "public can read translations" on public.translations;
create policy "public can read approved translations" on public.translations
  for select to anon, authenticated using (review_status = 'approved');

drop policy if exists "public can read approved meanings" on public.verse_meanings;
create policy "public can read approved meanings" on public.verse_meanings
  for select to anon, authenticated using (review_status = 'approved');

create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "users read own entitlement" on public.entitlements for select to authenticated using ((select auth.uid())=user_id);
create policy "users manage own devices" on public.notification_devices for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "users manage own bookmarks" on public.bookmarks for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- translation_glossary and translation_jobs are service-role/admin pipeline tables.
-- No anon/authenticated policies are intentionally created.

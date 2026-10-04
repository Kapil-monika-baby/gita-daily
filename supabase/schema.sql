create extension if not exists pgcrypto;

create table if not exists public.verses (
  id uuid primary key default gen_random_uuid(),
  chapter smallint not null,
  verse smallint not null,
  sanskrit text not null,
  transliteration text,
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
  unique(verse_id, language)
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_id uuid not null references public.verses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, verse_id)
);

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.notification_devices enable row level security;
alter table public.translations enable row level security;
alter table public.bookmarks enable row level security;

create policy "public can read verses" on public.verses for select using (true);
create policy "public can read translations" on public.translations for select using (true);
create policy "users read own profile" on public.profiles for select using (auth.uid()=id);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id);
create policy "users read own entitlement" on public.entitlements for select using (auth.uid()=user_id);
create policy "users manage own devices" on public.notification_devices for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users manage own bookmarks" on public.bookmarks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Run this in the Supabase SQL editor (or via `supabase db push`).
create table if not exists public.travel_plans (
  session_id text primary key,
  plan jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.travel_plans enable row level security;

-- Server-side writes use the service role key, which bypasses RLS.
-- No public policies needed unless you later expose reads to anon users.

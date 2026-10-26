-- ============================================================
-- ModTok 1.1: AI virtual try-on
--
-- Run ONCE in the Supabase SQL Editor before deploying the
-- virtual-try-on server function. Safe to re-run.
--
-- Keeps a count of try-ons so each shopper gets a daily limit and
-- ModTok's AI bill stays capped. No photos are ever stored here:
-- only who tried something on, when, and on whom (self or a model).
-- ============================================================

create table if not exists public.try_on_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null check (person in ('self','female','male')),
  created_at timestamptz not null default now()
);

create index if not exists try_on_usage_user_created_idx on public.try_on_usage (user_id, created_at desc);
create index if not exists try_on_usage_created_idx on public.try_on_usage (created_at desc);

-- Only the server function reads and writes this table.
alter table public.try_on_usage enable row level security;
revoke all on table public.try_on_usage from anon, authenticated;
grant all on table public.try_on_usage to service_role;

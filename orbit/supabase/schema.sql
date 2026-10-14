-- Orbit: one private row per account.
-- Run this once in your Supabase project (SQL Editor -> New query -> paste -> Run).

create table if not exists public.orbit_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row-level security: each person can only see and change their own row.
alter table public.orbit_state enable row level security;

drop policy if exists "Read own Orbit" on public.orbit_state;
create policy "Read own Orbit" on public.orbit_state
  for select using (auth.uid() = user_id);

drop policy if exists "Create own Orbit" on public.orbit_state;
create policy "Create own Orbit" on public.orbit_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Update own Orbit" on public.orbit_state;
create policy "Update own Orbit" on public.orbit_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Delete own Orbit" on public.orbit_state;
create policy "Delete own Orbit" on public.orbit_state
  for delete using (auth.uid() = user_id);

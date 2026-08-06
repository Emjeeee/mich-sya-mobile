-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Adds the two tables needed for the "Cari Pasangan" (Find My Partner) feature.
-- Follows the same my_couple_id() RLS pattern used by every existing table.

create table if not exists partner_presence (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couple(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  is_sharing boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id)
);

alter table partner_presence enable row level security;

create policy "select couple presence" on partner_presence
  for select using (couple_id = my_couple_id());

create policy "insert own presence" on partner_presence
  for insert with check (couple_id = my_couple_id() and user_id = auth.uid());

create policy "update own presence" on partner_presence
  for update using (couple_id = my_couple_id() and user_id = auth.uid());

alter publication supabase_realtime add table partner_presence;

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references couple(id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table device_push_tokens enable row level security;

create policy "select couple tokens" on device_push_tokens
  for select using (couple_id = my_couple_id());

create policy "insert own token" on device_push_tokens
  for insert with check (couple_id = my_couple_id() and user_id = auth.uid());

create policy "update own token" on device_push_tokens
  for update using (couple_id = my_couple_id() and user_id = auth.uid());

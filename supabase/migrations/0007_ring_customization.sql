-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Backs the new "Pengaturan Lanjutan" screen (mjonathann.03-only): a custom
-- ringtone upload and a "quiet hours" schedule, both couple-wide (apply to
-- BOTH devices, not just the account that configures them) -- see
-- AdvancedSettingsScreen.tsx. Stored on `couple` (not device_push_tokens)
-- since these are shared settings, not per-device state.
--
-- quiet_hours_start_minutes/end_minutes are minutes-since-midnight (0-1439)
-- in each device's own local time -- both null means the feature is off.
-- custom_ringtone_url stores a couple-photos bucket *path* (not a public
-- URL, same convention as memories/gallery/wishlist/journey uploads).

alter table couple add column if not exists custom_ringtone_url text;
alter table couple add column if not exists quiet_hours_start_minutes integer;
alter table couple add column if not exists quiet_hours_end_minutes integer;

-- `couple`'s own migration lives in the web repo, not this one, so there's
-- no visibility here into whether it already has an update policy -- add one
-- explicitly (safe no-op if RLS isn't even enabled on this table) so
-- AdvancedSettingsScreen.tsx's writes aren't silently blocked.
drop policy if exists "update own couple settings" on couple;
create policy "update own couple settings" on couple
  for update using (id = my_couple_id())
  with check (id = my_couple_id());

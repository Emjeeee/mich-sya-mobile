-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Backs "Kencan otomatis": a date starts by itself when both phones are near
-- each other (BLE) and ends when they separate -- see the presence beacon in
-- modules/ble-ring and src/lib/autoDate.ts.
--
-- home_lat/home_lng/home_radius_m: a "Rumah" location (couple-wide). Being
-- near each other inside it never auto-starts a date, so just being home
-- together doesn't log a date every evening.
-- auto_date_enabled: couple-wide on/off switch for the whole feature.

alter table couple add column if not exists home_lat double precision;
alter table couple add column if not exists home_lng double precision;
alter table couple add column if not exists home_radius_m integer not null default 150;
alter table couple add column if not exists auto_date_enabled boolean not null default false;

-- Both phones detect each other at about the same moment and both try to
-- start a session. At most ONE open (ended_at is null) session per couple:
-- the loser of the race gets a unique-violation (23505) and adopts the
-- winner's session instead of creating a duplicate.
-- Index creation would fail on pre-existing duplicate open sessions (e.g. a
-- date left running by mistake) -- close all but the newest per couple first.
update date_sessions s
   set ended_at = now()
 where s.ended_at is null
   and exists (
     select 1 from date_sessions n
      where n.couple_id = s.couple_id
        and n.ended_at is null
        and (n.started_at > s.started_at
             or (n.started_at = s.started_at and n.id > s.id))
   );

create unique index if not exists date_sessions_one_open_per_couple
  on date_sessions (couple_id)
  where ended_at is null;

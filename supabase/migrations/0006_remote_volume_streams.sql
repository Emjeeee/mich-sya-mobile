-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Extends 0005_remote_ringer_state.sql (which only covered the ring stream) to all
-- 4 user-facing volume streams Android's own system volume panel shows (confirmed
-- on both the Samsung A9 and the Vivo V51 5G): ring, notification, media, alarm.

alter table device_push_tokens add column if not exists remote_notification_volume_percent integer;
alter table device_push_tokens add column if not exists remote_media_volume_percent integer;
alter table device_push_tokens add column if not exists remote_alarm_volume_percent integer;

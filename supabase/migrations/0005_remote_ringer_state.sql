-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Lets RemoteControlPanel.tsx show the partner's *actual current* ringer mode/
-- volume before the controlling account touches anything (mode chip pre-selected,
-- volume slider pre-positioned), instead of adjusting blind. Reported by the
-- receiving device the same way remote_control_granted already is (see
-- 0004_remote_control_status.sql) -- RemoteControlAccess.tsx on mount/foreground.

alter table device_push_tokens add column if not exists remote_ringer_mode text;
alter table device_push_tokens add column if not exists remote_ring_volume_percent integer;

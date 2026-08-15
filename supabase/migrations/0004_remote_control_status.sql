-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Remote ringer-mode/volume control (RemoteControlPanel.tsx) is fire-and-forget
-- over push: setPartnerRingerMode()/adjustPartnerVolume() resolve `true` as soon
-- as Expo accepts the push for delivery, which says nothing about whether the
-- *receiving* device actually applied the change -- that call resolves false
-- silently (in a background task, with no UI) whenever the partner hasn't
-- granted "Do Not Disturb access" yet, which is the single most likely failure
-- mode for a brand new permission-gated feature. Reported as "tidak berfungsi
-- dan tidak ada tanda" (doesn't work, no sign of success/failure) -- this column
-- lets the *controlling* account see the other device's last-known grant status
-- ahead of time instead of pressing buttons into a void.

alter table device_push_tokens add column if not exists remote_control_granted boolean not null default false;

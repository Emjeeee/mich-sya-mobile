-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Adds a phone number column so "Bunyikan HP pasangan" can fall back to a
-- plain SMS trigger when the receiving phone has cellular signal but no
-- internet/data connection. Reuses device_push_tokens (already RLS'd so a
-- couple can read each other's rows) rather than a new table.

alter table device_push_tokens add column if not exists phone_number text;

-- A device may have a phone number saved without ever having granted
-- notification permission (no push token yet), or vice versa.
alter table device_push_tokens alter column expo_push_token drop not null;

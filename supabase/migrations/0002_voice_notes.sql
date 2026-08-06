-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Adds an optional voice-note attachment to memories, additive to the existing
-- photo/video + text story capture -- doesn't replace either.

alter table memories add column if not exists voice_note_url text;

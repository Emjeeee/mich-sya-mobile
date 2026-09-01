-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- RemoteControlPanel.tsx previously only ever read the partner's reported
-- mode/volume state once (on mount / app-foreground) -- "always shows
-- stale data until I background and reopen" was the direct complaint, and
-- there's no way to know the partner's *actual live* value without either
-- polling constantly or a real push channel. Enables Postgres realtime
-- change events on device_push_tokens so the controlling account's panel
-- can subscribe to the partner's row and reflect any change (from her own
-- device re-reporting, or from a request_remote_state round trip -- see
-- src/lib/remoteControl.ts's requestPartnerRemoteState) the moment it's
-- written, with the app open, no foreground/background cycle needed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'device_push_tokens'
  ) then
    alter publication supabase_realtime add table device_push_tokens;
  end if;
end $$;

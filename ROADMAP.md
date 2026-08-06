# MichSya Mobile — Roadmap

Living backlog of feature ideas beyond the original spec in `MOBILE_APP_HANDOFF.md`.

## Shipped (v1)

- Swipe-to-start/end date sessions, foreground + background location breadcrumbs
- Duration + summary -> `schedules`, route distance shown when a date ends
- Kenangan (photo/video/voice-note capture + story) -> `memories` + `gallery_photos`
- Wishlist -> promote to `couple_goals`
- Cari Pasangan: compass arrow, opt-in background location sharing (auto-starts on
  partner's phone via push, no need for them to open the app), ping, ring-device
- Journey map dwell-detection: during an active date, auto-detects lingering in one
  spot and prompts (via notification) to log it as a `journey_map` pin
- "On this day" nudge, next-date countdown, simple stats readout on Home screen
- Offline upload queue for Kenangan uploads (retries automatically when back online)
- App shortcuts (long-press launcher icon): "Mulai Kencan", "Bunyikan HP Pasangan"
- Standalone production build (no laptop/Metro dependency), pushed to GitHub, v1 release
- Ruth's phone onboarded and tested

## Backlog

- **Custom app icon/splash** — still on default Expo template assets pending the
  user's design input (an RM monogram logo was provided; needs compositing onto a
  broken-white background and generating properly sized assets).
- **iOS support** — deliberately deferred; needs a paid Apple Developer account and
  background-feature reliability would likely be weaker than Android given iOS's
  stricter background execution model.
- **Home-screen widget** — app shortcuts (long-press) shipped instead; a true
  widget would need hand-written native Android code, out of proportion for now.

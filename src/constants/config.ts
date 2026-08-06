// How often to drop a location breadcrumb while a date session is active.
export const LOCATION_PING_INTERVAL_MS = 5 * 60 * 1000;

// Journey map dwell detection: how close consecutive breadcrumbs must stay to count
// as "the same spot", and how long they must stay there before prompting to log it.
export const DWELL_RADIUS_METERS = 100;
export const DWELL_MIN_DURATION_MS = 20 * 60 * 1000;

// Mirrors the shared Supabase schema documented in MOBILE_APP_HANDOFF.md.
// Source of truth is the `michael-tasya` web repo's migrations -- keep in sync by hand,
// there is no shared codegen between the two repos.

export interface Couple {
  id: string;
  partner1_id: string;
  partner2_id: string;
}

export interface DateSession {
  id: string;
  couple_id: string;
  started_at: string;
  ended_at: string | null;
  title: string | null;
  summary: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  created_by: string | null;
  created_at: string;
}

export interface DateSessionLocation {
  id: string;
  session_id: string;
  couple_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

export type ScheduleStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  location: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: ScheduleStatus;
  created_by: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  photo_url: string | null; // storage path, not a URL -- see handoff doc section 4
  voice_note_url: string | null; // storage path, not a URL
  location: string | null;
  memory_date: string;
  created_by: string | null;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  couple_id: string;
  photo_path: string;
  created_by: string | null;
  created_at: string;
}

export interface JourneyMapEntry {
  id: string;
  couple_id: string;
  place_name: string;
  description: string | null;
  photo_url: string | null; // storage path, not a URL
  lat: number;
  lng: number;
  visited_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  image_url: string | null; // storage path, not a URL
  is_done: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CoupleGoal {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  is_done: boolean;
  linked_wishlist_item_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PartnerPresence {
  id: string;
  couple_id: string;
  user_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  is_sharing: boolean;
  updated_at: string;
}

export interface DevicePushToken {
  id: string;
  user_id: string;
  couple_id: string;
  expo_push_token: string;
  updated_at: string;
}

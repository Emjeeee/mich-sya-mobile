import { supabase } from './supabase';

const BUCKET = 'couple-photos';

// Client-side cap before upload -- mirrors the CHAT_MEDIA_LIMITS pattern from the
// web repo's src/lib/storage.ts, applied here for date-session/memory video uploads.
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

function extensionFromUri(uri: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(uri.split('?')[0]);
  return match ? match[1].toLowerCase() : fallback;
}

// Uploads a local file:// URI to the couple-photos bucket and returns the
// storage path (not a public URL -- the bucket is private, resolve to a
// signed URL only when actually displaying the file).
export async function uploadCouplePhoto(
  coupleId: string,
  folder: 'gallery' | 'memories' | 'wishlist' | 'journey',
  uri: string,
  contentType: string
): Promise<string> {
  const ext = extensionFromUri(uri, contentType.includes('video') ? 'mp4' : 'jpg');
  const path = `${coupleId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  if (contentType.includes('video') && arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(
      `Video terlalu besar (maks ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB). Coba video yang lebih pendek.`
    );
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType,
  });

  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

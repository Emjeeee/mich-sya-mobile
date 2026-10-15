import { supabase } from './supabase';

const BUCKET = 'couple-photos';

// Client-side cap before upload -- mirrors the CHAT_MEDIA_LIMITS pattern from the
// web repo's src/lib/storage.ts, applied here for date-session/memory video uploads.
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
// A ringtone-length MP3 is a few hundred KB to a few MB -- this is just a
// sanity cap so someone doesn't upload a full album track that both devices
// then have to download every time it changes (see AdvancedSettingsScreen.tsx).
const MAX_SOUND_SIZE_BYTES = 10 * 1024 * 1024;

// Permanent failure (retrying can never succeed) -- the offline queue must not
// keep re-attempting these. Flag instead of instanceof: safer across Hermes/Babel.
export function isUploadValidationError(err: unknown): boolean {
  return !!err && (err as { isValidation?: boolean }).isValidation === true;
}

function validationError(message: string): Error {
  return Object.assign(new Error(message), { isValidation: true });
}

const VIDEO_TOO_BIG = `Video terlalu besar (maks ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB). Coba video yang lebih pendek.`;

// Cheap pre-read check using the picker's reported size, so an oversized file
// is rejected before it is ever loaded into memory.
export function checkVideoSize(contentType: string, fileSize: number | null | undefined): string | null {
  if (contentType.includes('video') && fileSize != null && fileSize > MAX_VIDEO_SIZE_BYTES) return VIDEO_TOO_BIG;
  return null;
}

function extensionFromUri(uri: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(uri.split('?')[0]);
  return match ? match[1].toLowerCase() : fallback;
}

// Uploads a local file:// URI to the couple-photos bucket and returns the
// storage path (not a public URL -- the bucket is private, resolve to a
// signed URL only when actually displaying the file).
export async function uploadCouplePhoto(
  coupleId: string,
  folder: 'gallery' | 'memories' | 'wishlist' | 'journey' | 'sounds',
  uri: string,
  contentType: string
): Promise<string> {
  const defaultExt = contentType.includes('video') ? 'mp4' : contentType.includes('audio') ? 'mp3' : 'jpg';
  const ext = extensionFromUri(uri, defaultExt);
  const path = `${coupleId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  if (contentType.includes('video') && arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
    throw validationError(VIDEO_TOO_BIG);
  }
  if (contentType.includes('audio') && arrayBuffer.byteLength > MAX_SOUND_SIZE_BYTES) {
    throw validationError(
      `File suara terlalu besar (maks ${MAX_SOUND_SIZE_BYTES / (1024 * 1024)}MB). Coba file yang lebih kecil.`
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

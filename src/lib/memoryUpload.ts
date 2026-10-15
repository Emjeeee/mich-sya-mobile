import { uploadCouplePhoto } from './storage';
import { supabase } from './supabase';
import type { PendingMemory } from './offlineQueue';

// Derives a stable per-row uuid from the item's uuid so retries hit the same rows.
function rowId(baseId: string, index: number): string {
  return baseId.slice(0, -4) + index.toString(16).padStart(4, '0');
}

// Shared by the direct save path (AddMemoryModal) and the offline queue retry path --
// both need the exact same upload-then-batch-insert sequence.
export async function saveMemoryNow(item: PendingMemory): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData.user?.id ?? null;

  // Sequential, not Promise.all: each upload holds a whole file as an ArrayBuffer.
  const paths: string[] = [];
  for (const [i, asset] of item.assets.entries()) {
    paths.push(await uploadCouplePhoto(item.coupleId, 'memories', asset.uri, asset.mimeType, `${item.id}-${i}`));
  }
  const voiceNotePath = item.voiceNote
    ? await uploadCouplePhoto(item.coupleId, 'memories', item.voiceNote.uri, item.voiceNote.mimeType, `${item.id}-v`)
    : null;

  // A voice note with no photos still needs one row to attach to; a voice note
  // alongside photos rides along on every row from this same capture.
  const photoPaths = paths.length > 0 ? paths : [null];

  // ignoreDuplicates: a retry skips rows already saved (no UPDATE needed, no duplicates).
  const { error: memoriesError } = await supabase.from('memories').upsert(
    photoPaths.map((path, i) => ({
      id: rowId(item.id, i),
      couple_id: item.coupleId,
      title: item.title,
      description: item.story || null,
      photo_url: path,
      voice_note_url: voiceNotePath,
      memory_date: item.memoryDate,
      created_by: createdBy,
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (memoriesError) throw memoriesError;

  if (paths.length > 0) {
    const { error: galleryError } = await supabase.from('gallery_photos').upsert(
      paths.map((path, i) => ({
        id: rowId(item.id, i),
        couple_id: item.coupleId,
        photo_path: path,
        created_by: createdBy,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (galleryError) throw galleryError;
  }
}

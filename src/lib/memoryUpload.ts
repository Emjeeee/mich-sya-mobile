import { uploadCouplePhoto } from './storage';
import { supabase } from './supabase';
import type { PendingMemory } from './offlineQueue';

// Shared by the direct save path (AddMemoryModal) and the offline queue retry path --
// both need the exact same upload-then-batch-insert sequence.
export async function saveMemoryNow(item: PendingMemory): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData.user?.id ?? null;

  const [paths, voiceNotePath] = await Promise.all([
    Promise.all(
      item.assets.map((asset) =>
        uploadCouplePhoto(item.coupleId, 'memories', asset.uri, asset.mimeType)
      )
    ),
    item.voiceNote
      ? uploadCouplePhoto(item.coupleId, 'memories', item.voiceNote.uri, item.voiceNote.mimeType)
      : Promise.resolve(null),
  ]);

  // A voice note with no photos still needs one row to attach to; a voice note
  // alongside photos rides along on every row from this same capture.
  const photoPaths = paths.length > 0 ? paths : [null];

  const { error: memoriesError } = await supabase.from('memories').insert(
    photoPaths.map((path) => ({
      couple_id: item.coupleId,
      title: item.title,
      description: item.story || null,
      photo_url: path,
      voice_note_url: voiceNotePath,
      memory_date: item.memoryDate,
      created_by: createdBy,
    }))
  );
  if (memoriesError) throw memoriesError;

  if (paths.length > 0) {
    const { error: galleryError } = await supabase.from('gallery_photos').insert(
      paths.map((path) => ({
        couple_id: item.coupleId,
        photo_path: path,
        created_by: createdBy,
      }))
    );
    if (galleryError) throw galleryError;
  }
}

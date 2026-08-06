import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveMemoryNow } from './memoryUpload';

const QUEUE_KEY = 'michsya.offlineMemoryQueue';

export interface PendingMemory {
  id: string;
  coupleId: string;
  title: string;
  story: string;
  memoryDate: string;
  assets: { uri: string; mimeType: string }[];
  voiceNote: { uri: string; mimeType: string } | null;
}

async function getQueue(): Promise<PendingMemory[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingMemory[]) : [];
}

async function setQueue(queue: PendingMemory[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueuePendingMemory(item: Omit<PendingMemory, 'id'>) {
  const queue = await getQueue();
  queue.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await setQueue(queue);
}

// Retries every queued memory; anything that still fails (still offline) stays queued.
// Safe to call opportunistically (app foreground, after any successful upload) --
// a no-op when the queue is empty.
export async function flushPendingMemories() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const remaining: PendingMemory[] = [];
  for (const item of queue) {
    try {
      await saveMemoryNow(item);
    } catch {
      remaining.push(item);
    }
  }
  await setQueue(remaining);
}

export async function getPendingMemoryCount(): Promise<number> {
  return (await getQueue()).length;
}

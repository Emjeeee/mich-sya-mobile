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

// enqueuePendingMemory() and flushPendingMemories() both do an
// unsynchronized read-modify-write of the same AsyncStorage key --
// AddMemoryModal.tsx fires flushPendingMemories() without awaiting it right
// after a successful save, so it can genuinely overlap with a concurrent
// enqueue (a different item failing to upload around the same time). Without
// serializing them, flushPendingMemories() can finish its (possibly slow,
// per-item network) work and write back a `remaining` list computed from a
// queue snapshot taken *before* a concurrent enqueue added a new item,
// silently deleting that newly-queued item when it overwrites storage. A
// simple chained lock makes every read-modify-write cycle here run strictly
// one at a time, regardless of call order.
let queueLock: Promise<unknown> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queueLock.then(fn, fn);
  queueLock = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export async function enqueuePendingMemory(item: Omit<PendingMemory, 'id'>) {
  await withQueueLock(async () => {
    const queue = await getQueue();
    queue.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
    await setQueue(queue);
  });
}

// Retries every queued memory; anything that still fails (still offline) stays queued.
// Safe to call opportunistically (app foreground, after any successful upload) --
// a no-op when the queue is empty.
export async function flushPendingMemories() {
  await withQueueLock(async () => {
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
  });
}

export async function getPendingMemoryCount(): Promise<number> {
  return (await getQueue()).length;
}

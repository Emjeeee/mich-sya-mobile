import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecentExits } from 'ble-ring';

const CRASH_KEY = 'michsya.lastCrash';
const CLEARED_KEY = 'michsya.crashLogClearedAt';
// A crash by definition can happen mid-write to other keys, on either
// thread -- capped list (not a growing log) so one bad loop can't fill
// storage, and each entry is a complete JSON write so a torn write can only
// ever lose the newest entry, never corrupt older ones.
const MAX_ENTRIES = 5;

export interface CrashEntry {
  message: string;
  stack: string | null;
  isFatal: boolean;
  source: 'global' | 'boundary' | 'native';
  screen: string | null;
  timestamp: string;
}

async function readEntries(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_KEY);
    return raw ? (JSON.parse(raw) as CrashEntry[]) : [];
  } catch {
    return [];
  }
}

// Callers may ignore the returned promise (it never rejects); the fatal-error
// handler awaits it briefly. Fire-and-forget by design -- called from a global exception handler and a
// React error boundary, neither of which can safely await much (the process
// may be about to terminate) or throw further (there's nowhere left for
// that error to go).
export function recordCrash(entry: Omit<CrashEntry, 'timestamp'>): Promise<void> {
  return readEntries()
    .then((existing) => {
      const next = [{ ...entry, timestamp: new Date().toISOString() }, ...existing].slice(0, MAX_ENTRIES);
      return AsyncStorage.setItem(CRASH_KEY, JSON.stringify(next));
    })
    .catch(() => {});
}

// Android's own process-exit record (native crash / ANR / low-memory kill):
// the only trace of a crash that killed the process before any JS ran. The OS
// history can't be cleared from here, so "Hapus" stores a timestamp and
// anything older is hidden.
async function readNativeExits(): Promise<CrashEntry[]> {
  try {
    const clearedRaw = await AsyncStorage.getItem(CLEARED_KEY);
    const clearedAt = clearedRaw ? Number(clearedRaw) : 0;
    const exits = await getRecentExits();
    return exits
      .filter((e) => e.timestamp > clearedAt)
      .map((e) => ({
        message: `Proses aplikasi berhenti: ${e.reason}${e.description ? ` (${e.description})` : ''}`,
        stack: null,
        isFatal: true,
        source: 'native' as const,
        screen: null,
        timestamp: new Date(e.timestamp).toISOString(),
      }));
  } catch {
    return [];
  }
}

export async function getCrashLog(): Promise<CrashEntry[]> {
  const [js, native] = await Promise.all([readEntries(), readNativeExits()]);
  return [...js, ...native].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, MAX_ENTRIES);
}

export async function clearCrashLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CRASH_KEY);
    await AsyncStorage.setItem(CLEARED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

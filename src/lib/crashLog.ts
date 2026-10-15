import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_KEY = 'michsya.lastCrash';
// A crash by definition can happen mid-write to other keys, on either
// thread -- capped list (not a growing log) so one bad loop can't fill
// storage, and each entry is a complete JSON write so a torn write can only
// ever lose the newest entry, never corrupt older ones.
const MAX_ENTRIES = 5;

export interface CrashEntry {
  message: string;
  stack: string | null;
  isFatal: boolean;
  source: 'global' | 'boundary';
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

export async function getCrashLog(): Promise<CrashEntry[]> {
  return readEntries();
}

export async function clearCrashLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CRASH_KEY);
  } catch {
    // ignore
  }
}

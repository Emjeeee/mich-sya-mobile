import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { supabase } from './supabase';

export const ON_THIS_DAY_TASK_NAME = 'michsya-on-this-day';
const LAST_NOTIFIED_KEY = 'michsya.onThisDayLastNotified';

async function checkOnThisDay(): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
  if (lastNotified === todayStr) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  const coupleId = coupleRows?.[0]?.id;
  if (!coupleId) return;

  const { data: memories } = await supabase
    .from('memories')
    .select('title, memory_date')
    .eq('couple_id', coupleId);
  if (!memories) return;

  const todayMonthDay = todayStr.slice(5);
  const currentYear = todayStr.slice(0, 4);

  const match = memories.find((m) => {
    const d = m.memory_date as string;
    return d.slice(5) === todayMonthDay && d.slice(0, 4) !== currentYear;
  });
  if (!match) return;

  const years = Number(currentYear) - Number((match.memory_date as string).slice(0, 4));

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${years} tahun lalu di hari ini 💕`,
      body: match.title as string,
      data: { type: 'on_this_day' },
    },
    trigger: null,
  });

  await AsyncStorage.setItem(LAST_NOTIFIED_KEY, todayStr);
}

// Defined at module scope like the other background tasks. Best-effort on exact
// timing -- WorkManager periodic tasks are treated as a minimum delay, not a
// schedule, and the OS can defer them for battery optimization. The foreground
// check (checkOnThisDayNow, called on app open) is a supplementary trigger so
// this isn't purely dependent on OS timing.
TaskManager.defineTask(ON_THIS_DAY_TASK_NAME, async () => {
  try {
    await checkOnThisDay();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

BackgroundTask.registerTaskAsync(ON_THIS_DAY_TASK_NAME, { minimumInterval: 12 * 60 });

export async function checkOnThisDayNow() {
  await checkOnThisDay();
}

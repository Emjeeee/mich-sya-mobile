import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from './src/lib/backgroundLocation';
import { getCurrentCoords } from './src/lib/location';
import { ringPartner } from './src/lib/ringPartner';
import { supabase } from './src/lib/supabase';
import { torchPartner } from './src/lib/torchPartner';
import { DEFAULT_TORCH_PATTERN, TORCH_PATTERN_STORAGE_KEY, type TorchPattern } from './src/lib/torchPattern';
import { DateWidget, fetchWidgetState, WIDGET_NAME } from './src/lib/widget';
import type { DateSession } from './src/types/database';

async function renderCurrentState(renderWidget: WidgetTaskHandlerProps['renderWidget']) {
  const { session, nextSchedule } = await fetchWidgetState();
  renderWidget(<DateWidget session={session} nextSchedule={nextSchedule} />);
}

async function handleStartEndDate() {
  const { coupleId, session } = await fetchWidgetState();
  if (!coupleId) return;

  const { data: userData } = await supabase.auth.getUser();
  const coords = await getCurrentCoords();

  if (session) {
    await supabase
      .from('date_sessions')
      .update({
        ended_at: new Date().toISOString(),
        end_lat: coords?.lat ?? null,
        end_lng: coords?.lng ?? null,
      })
      .eq('id', session.id);

    const startedAt = new Date(session.started_at);
    await supabase.from('schedules').insert({
      couple_id: coupleId,
      title: session.title || 'Kencan',
      description: session.summary,
      scheduled_date: startedAt.toISOString().slice(0, 10),
      scheduled_time: startedAt.toISOString().slice(11, 16),
      status: 'completed',
      created_by: userData.user?.id ?? null,
    });

    await stopBackgroundLocationTracking();
  } else {
    const { data, error } = await supabase
      .from('date_sessions')
      .insert({
        couple_id: coupleId,
        created_by: userData.user?.id ?? null,
        start_lat: coords?.lat ?? null,
        start_lng: coords?.lng ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      const newSession = data as DateSession;
      if (coords) {
        await supabase.from('date_session_locations').insert({
          session_id: newSession.id,
          couple_id: coupleId,
          lat: coords.lat,
          lng: coords.lng,
        });
      }
      await startBackgroundLocationTracking(newSession.id, coupleId);
    }
  }
}

async function handleQuickMemory() {
  const { coupleId } = await fetchWidgetState();
  if (!coupleId) return;

  const { data: userData } = await supabase.auth.getUser();
  const coords = await getCurrentCoords();

  await supabase.from('memories').insert({
    couple_id: coupleId,
    title: 'Momen spontan 💕',
    description: null,
    photo_url: null,
    voice_note_url: null,
    location: coords ? `${coords.lat}, ${coords.lng}` : null,
    memory_date: new Date().toISOString().slice(0, 10),
    created_by: userData.user?.id ?? null,
  });
}

async function handleTorch() {
  const raw = await AsyncStorage.getItem(TORCH_PATTERN_STORAGE_KEY).catch(() => null);
  let pattern: TorchPattern = DEFAULT_TORCH_PATTERN;
  if (raw) {
    try {
      pattern = JSON.parse(raw) as TorchPattern;
    } catch {
      pattern = DEFAULT_TORCH_PATTERN;
    }
  }
  await torchPartner(null, pattern);
}

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await renderCurrentState(props.renderWidget);
      break;
    case 'WIDGET_CLICK':
      if (props.clickAction === 'start_end_date') {
        await handleStartEndDate();
      } else if (props.clickAction === 'quick_memory') {
        await handleQuickMemory();
      } else if (props.clickAction === 'ring_partner') {
        await ringPartner();
      } else if (props.clickAction === 'torch_partner') {
        await handleTorch();
      }
      await renderCurrentState(props.renderWidget);
      break;
    default:
      break;
  }
}

registerWidgetTaskHandler(widgetTaskHandler);

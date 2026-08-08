import { FlexWidget, requestWidgetUpdate, TextWidget } from 'react-native-android-widget';

import { supabase } from './supabase';
import type { DateSession, Schedule } from '../types/database';

export const WIDGET_NAME = 'DateStatus';

export interface WidgetState {
  coupleId: string | null;
  session: DateSession | null;
  nextSchedule: Schedule | null;
}

export async function fetchWidgetState(): Promise<WidgetState> {
  const { data: coupleRows } = await supabase.from('couple').select('id').limit(1);
  const coupleId = (coupleRows?.[0]?.id as string) ?? null;
  if (!coupleId) return { coupleId: null, session: null, nextSchedule: null };

  const { data: activeSessions } = await supabase
    .from('date_sessions')
    .select('*')
    .eq('couple_id', coupleId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  const { data: scheduleRows } = await supabase
    .from('schedules')
    .select('*')
    .eq('couple_id', coupleId)
    .in('status', ['planned', 'confirmed'])
    .gte('scheduled_date', new Date().toISOString().slice(0, 10))
    .order('scheduled_date', { ascending: true })
    .limit(1);

  return {
    coupleId,
    session: (activeSessions?.[0] as DateSession) ?? null,
    nextSchedule: (scheduleRows?.[0] as Schedule) ?? null,
  };
}

function statusLabel(session: DateSession | null, nextSchedule: Schedule | null): string {
  if (session) {
    const started = new Date(session.started_at);
    const hh = String(started.getHours()).padStart(2, '0');
    const mm = String(started.getMinutes()).padStart(2, '0');
    return `⏱ Kencan berjalan sejak ${hh}:${mm}`;
  }
  if (nextSchedule) {
    const daysUntil = Math.round(
      (new Date(nextSchedule.scheduled_date).getTime() - new Date().setHours(0, 0, 0, 0)) /
        (24 * 60 * 60 * 1000)
    );
    const when = daysUntil <= 0 ? 'Hari ini' : `${daysUntil} hari lagi`;
    return `${when}: ${nextSchedule.title}`;
  }
  return 'Belum ada kencan aktif';
}

const actionButtonStyle = {
  flex: 1,
  backgroundColor: '#fdeef4' as const,
  borderRadius: 10,
  paddingVertical: 8,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const actionTextStyle = {
  fontSize: 12,
  fontWeight: '600' as const,
  color: '#e11d74' as const,
};

export function DateWidget({
  session,
  nextSchedule,
}: {
  session: DateSession | null;
  nextSchedule: Schedule | null;
}) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
      }}
    >
      <TextWidget
        text={statusLabel(session, nextSchedule)}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 13, fontWeight: '600', color: '#e11d74' }}
      />
      <FlexWidget style={{ flexDirection: 'row', marginTop: 10, flexGap: 8 }}>
        <FlexWidget clickAction="start_end_date" style={actionButtonStyle}>
          <TextWidget text={session ? 'Akhiri' : 'Mulai'} style={actionTextStyle} />
        </FlexWidget>
        <FlexWidget clickAction="quick_memory" style={actionButtonStyle}>
          <TextWidget text="💕 Momen" style={actionTextStyle} />
        </FlexWidget>
        <FlexWidget clickAction="ring_partner" style={actionButtonStyle}>
          <TextWidget text="🔊 Bunyikan" style={actionTextStyle} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

// Fire-and-forget from anywhere state relevant to the widget changes (date
// start/end, quick memory, app foregrounded, a partner-triggered
// 'widget_refresh' push). No-ops quietly if no widget is on the home screen.
export async function refreshWidget(): Promise<void> {
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: async () => {
      const { session, nextSchedule } = await fetchWidgetState();
      return <DateWidget session={session} nextSchedule={nextSchedule} />;
    },
  });
}

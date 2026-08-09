import { FlexWidget, ImageWidget, requestWidgetUpdate, TextWidget } from 'react-native-android-widget';

import { supabase } from './supabase';
import { formatElapsed } from './time';
import type { DateSession, Schedule } from '../types/database';

const ICON_PLAY = require('../../assets/icons/play.png');
const ICON_STOP = require('../../assets/icons/stop.png');
const ICON_HEART = require('../../assets/icons/heart.png');
const ICON_BELL = require('../../assets/icons/bell.png');

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

interface ContentBlock {
  headline: string;
  caption: string;
}

function contentBlock(session: DateSession | null, nextSchedule: Schedule | null): ContentBlock {
  if (session) {
    return { headline: formatElapsed(session.started_at), caption: '⏱ Kencan berjalan' };
  }
  if (nextSchedule) {
    const daysUntil = Math.round(
      (new Date(nextSchedule.scheduled_date).getTime() - new Date().setHours(0, 0, 0, 0)) /
        (24 * 60 * 60 * 1000)
    );
    const when = daysUntil <= 0 ? 'Hari ini' : `${daysUntil} hari lagi`;
    return { headline: when, caption: nextSchedule.title };
  }
  return { headline: 'Belum ada kencan', caption: 'Yuk rencanain kencan berikutnya 💌' };
}

const actionButtonStyle = {
  flex: 1,
  minWidth: 72,
  backgroundColor: 'rgba(255, 255, 255, 0.20)' as const,
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 12,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const actionTextStyle = {
  fontSize: 11,
  fontWeight: '700' as const,
  color: '#ffffff' as const,
  marginTop: 4,
};

function ActionButton({
  clickAction,
  icon,
  label,
}: {
  clickAction: string;
  icon: number;
  label: string;
}) {
  return (
    <FlexWidget clickAction={clickAction} style={actionButtonStyle}>
      <ImageWidget image={icon} imageWidth={20} imageHeight={20} />
      <TextWidget text={label} maxLines={1} truncate="END" style={actionTextStyle} />
    </FlexWidget>
  );
}

export function DateWidget({
  session,
  nextSchedule,
}: {
  session: DateSession | null;
  nextSchedule: Schedule | null;
}) {
  const { headline, caption } = contentBlock(session, nextSchedule);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: { from: '#ff5f9e', to: '#c81157', orientation: 'TL_BR' },
        borderRadius: 20,
        padding: 14,
      }}
    >
      <TextWidget
        text="🤍 MichSya"
        maxLines={1}
        truncate="END"
        style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255, 255, 255, 0.75)' }}
      />

      <FlexWidget style={{ flexDirection: 'column', marginVertical: 4 }}>
        <TextWidget
          text={headline}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 26, fontWeight: '700', color: '#ffffff' }}
        />
        <TextWidget
          text={caption}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', flexGap: 6 }}>
        <ActionButton
          clickAction="start_end_date"
          icon={session ? ICON_STOP : ICON_PLAY}
          label={session ? 'Akhiri' : 'Mulai'}
        />
        <ActionButton clickAction="quick_memory" icon={ICON_HEART} label="Momen" />
        <ActionButton clickAction="ring_partner" icon={ICON_BELL} label="Bunyikan" />
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

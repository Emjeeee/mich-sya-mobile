import type { ComponentType } from 'react';
import type { PixelIconName } from '../../components/ui/pixel-icons';

export type ScoreMode = 'wins' | 'score' | 'none';

export interface GameDef {
  key: string;
  title: string;
  description: string;
  icon: PixelIconName;
  hasOnline: boolean;
  scoreMode: ScoreMode;
  /** For scoreMode 'score': ascending (lower is better, e.g. ms/moves) or descending (higher is better). */
  scoreSort?: 'asc' | 'desc';
  scoreUnit?: string;
  LocalComponent: ComponentType<{ coupleId?: string | null }>;
  OnlineComponent?: ComponentType<{ coupleId?: string | null }>;
  /** false for games still pending porting from the web app -- shows ComingSoonGame instead. Defaults to true. */
  implemented?: boolean;
}

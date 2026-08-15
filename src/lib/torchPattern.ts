// Flat shape shared verbatim across all 3 trigger channels (push payload,
// BLE service-data bytes, SMS text suffix) and the native side
// (TorchReactor.stepsFor) -- onMs/offMs only matter when kind is 'custom'.
// 'stop' isn't a blink pattern -- it's a control action (see
// TorchBlinkService.requestStop) that reuses this same kind field so it can
// flow through the exact same 3-channel plumbing as every other kind.
export type TorchPatternKind = 'steady' | 'slow' | 'fast' | 'sos' | 'custom' | 'stop';

export interface TorchPattern {
  kind: TorchPatternKind;
  onMs?: number;
  offMs?: number;
}

// 'stop' excluded too, alongside 'custom' -- neither is a selectable preset
// chip (see TORCH_PRESET_ORDER in FindPartnerModal.tsx, a separate
// hand-curated array that never includes 'stop').
export const TORCH_PRESET_LABELS: Record<Exclude<TorchPatternKind, 'custom' | 'stop'>, string> = {
  steady: 'Nyala terus',
  slow: 'Kedip pelan',
  fast: 'Kedip cepat',
  sos: 'SOS',
};

export const DEFAULT_TORCH_PATTERN: TorchPattern = { kind: 'slow' };

// Last pattern picked in FindPartnerModal, persisted so the widget's torch
// button (no UI of its own to pick a pattern) can reuse it.
export const TORCH_PATTERN_STORAGE_KEY = 'michsya.lastTorchPattern';

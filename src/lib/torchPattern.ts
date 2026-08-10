// Flat shape shared verbatim across all 3 trigger channels (push payload,
// BLE service-data bytes, SMS text suffix) and the native side
// (TorchReactor.stepsFor) -- onMs/offMs only matter when kind is 'custom'.
export type TorchPatternKind = 'steady' | 'slow' | 'fast' | 'sos' | 'custom';

export interface TorchPattern {
  kind: TorchPatternKind;
  onMs?: number;
  offMs?: number;
}

export const TORCH_PRESET_LABELS: Record<Exclude<TorchPatternKind, 'custom'>, string> = {
  steady: 'Nyala terus',
  slow: 'Kedip pelan',
  fast: 'Kedip cepat',
  sos: 'SOS',
};

export const DEFAULT_TORCH_PATTERN: TorchPattern = { kind: 'slow' };

// Last pattern picked in FindPartnerModal, persisted so the widget's torch
// button (no UI of its own to pick a pattern) can reuse it.
export const TORCH_PATTERN_STORAGE_KEY = 'michsya.lastTorchPattern';

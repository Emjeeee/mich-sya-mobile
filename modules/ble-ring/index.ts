import { requireNativeModule } from 'expo-modules-core';

interface BleRingModuleType {
  /**
   * Advertises a short-lived BLE signal that any nearby phone running
   * MichSya and listening (see startScanning) will pick up as a ring
   * trigger. No pairing, no internet, no Supabase/FCM involved. Resolves
   * `true` if advertising started (doesn't guarantee anyone was in range).
   */
  broadcastRing(): Promise<boolean>;
  /**
   * Same connectionless BLE advertisement as broadcastRing, but tagged as a
   * torch event carrying the blink pattern (see src/lib/torchPattern.ts) --
   * BleRingScanService reads it back out of the advertisement's service
   * data to know which flavor of event fired without needing pairing.
   */
  broadcastTorch(kind: string, onMs: number | null, offMs: number | null): Promise<boolean>;
  /**
   * Starts the persistent foreground service that scans for the ring/torch
   * signal in the background, even with the app fully closed. Reacts
   * entirely natively (sound/vibration/full-screen alert for ring; camera
   * torch for torch) -- deliberately not dependent on the JS engine being
   * alive, since that's exactly what makes the internet-based push path
   * unreliable when the app is killed.
   */
  startScanning(): Promise<boolean>;
  stopScanning(): Promise<void>;
  isScanning(): Promise<boolean>;
  /**
   * Sends a plain SMS containing a fixed trigger marker to the given phone
   * number. Fallback for when the receiving phone has cellular signal but no
   * internet/data -- SMS goes over the carrier network independent of data.
   */
  sendRingSms(phoneNumber: string): Promise<boolean>;
  /** Same idea as sendRingSms, with the blink pattern encoded as a suffix. */
  sendTorchSms(phoneNumber: string, kind: string, onMs: number | null, offMs: number | null): Promise<boolean>;
  /**
   * Starts the native torch blink loop directly (no BLE/SMS payload to
   * decode) -- used by the push-triggered path, since there's no headless-
   * safe way to blink the torch from JS itself.
   */
  triggerTorch(kind: string, onMs: number | null, offMs: number | null): Promise<boolean>;
  /**
   * Same idea as triggerTorch, for the push channel's "ring" payload --
   * runs the native RingReactor (sound/vibrate/full-screen alert) directly
   * instead of the JS-side expo-audio player, since RingReactor reliably
   * bypasses the device's ringer mode AND a separately muted media stream
   * (routes to the ALARM audio stream), which expo-audio does not.
   */
  triggerRing(): Promise<boolean>;
  /**
   * Stops whatever RingReactor started (sound, vibration, notification) --
   * used by RingAlertScreen's swipe-to-dismiss, since a push-triggered
   * ring's actual sound now lives natively, not in a JS audio player.
   */
  stopRing(): Promise<boolean>;
  /**
   * Per-device "silent ring" preference -- when true, all 3 trigger
   * channels react on this device with vibration only, no sound. See
   * src/lib/silentRing.ts for where this gets set.
   */
  setSilentRing(silent: boolean): Promise<boolean>;
  isSilentRing(): Promise<boolean>;
  /**
   * Push channel's bridge for remotely stopping the *other* device's torch
   * -- see src/lib/torchPattern.ts's 'stop' kind and FindPartnerModal.tsx's
   * "Matikan senter pasangan" button.
   */
  stopTorch(): Promise<boolean>;
  /**
   * Whether this device has granted "Do Not Disturb access" -- required
   * (separately from any PermissionsAndroid runtime permission) before
   * setRingerMode/setStreamVolume below will actually work for the
   * "ring"/"notification" streams. See src/lib/remoteControl.ts.
   */
  hasRemoteControlAccess(): Promise<boolean>;
  /** Opens system Settings for the user to grant DND access manually -- can't be requested programmatically. */
  requestRemoteControlAccess(): Promise<boolean>;
  /** Sets this device's own ringer mode; resolves false if DND access isn't granted or `mode` is unrecognized. */
  setRingerMode(mode: string): Promise<boolean>;
  /**
   * Sets one of this device's own 4 user-facing volume streams (matches the
   * 4 sliders in Android's own system volume panel on both the A9 and the
   * Vivo) to an exact 0-100 percent. Only "ring"/"notification" need DND
   * access granted first (same gate as setRingerMode) -- "media"/"alarm"
   * don't, since Android doesn't tie them to ringer mode at all.
   */
  setStreamVolume(stream: 'ring' | 'notification' | 'media' | 'alarm', percent: number): Promise<boolean>;
  /**
   * Reads this device's current ringer mode + all 4 stream volumes (each
   * 0-100, normalized since the actual step count varies by device/stream).
   * Plain getters -- unlike setRingerMode/setStreamVolume, no DND access
   * needed for any of these.
   */
  getVolumeState(): Promise<{
    mode: 'normal' | 'vibrate' | 'silent';
    ring: number;
    notification: number;
    media: number;
    alarm: number;
  } | null>;
  /**
   * Whether this device has exempted the app from Doze/App Standby battery
   * restrictions. OEMs with aggressive background-kill policies (Vivo,
   * Xiaomi, Oppo...) enforce this far more strictly than stock Android, and
   * every background feature this app has (push ring/torch/remote control,
   * the BLE scan foreground service, "Cari Pasangan" background location)
   * depends on the process being allowed to wake up at all. See
   * BatteryOptimizationNotice.tsx.
   */
  hasBatteryOptimizationExemption(): Promise<boolean>;
  /** Launches the direct system dialog to request the exemption above -- one tap, unlike a generic Settings screen. */
  requestBatteryOptimizationExemption(): Promise<boolean>;
  /**
   * Points RingReactor/BatteryAlertReactor at a locally-downloaded custom
   * ringtone file (or clears the override with `null`) -- see
   * AdvancedSettingsScreen.tsx. JS downloads the file itself (native code
   * has no network access at trigger time); this only records the resulting
   * local path.
   */
  setCustomRingtonePath(path: string | null): Promise<boolean>;
  /**
   * Syncs the couple-wide "quiet hours" window (minutes-since-midnight, both
   * null disables it) down into this device's local prefs so ring/battery-
   * alert sound can be suppressed without a network round trip at trigger
   * time. See AdvancedSettingsScreen.tsx.
   */
  setQuietHours(startMinutes: number | null, endMinutes: number | null): Promise<boolean>;
}

export const BleRingModule = requireNativeModule<BleRingModuleType>('BleRing');

export const broadcastRing = () => BleRingModule.broadcastRing();
export const broadcastTorch = (kind: string, onMs: number | null, offMs: number | null) =>
  BleRingModule.broadcastTorch(kind, onMs, offMs);
export const startScanning = () => BleRingModule.startScanning();
export const stopScanning = () => BleRingModule.stopScanning();
export const isScanning = () => BleRingModule.isScanning();
export const sendRingSms = (phoneNumber: string) => BleRingModule.sendRingSms(phoneNumber);
export const sendTorchSms = (phoneNumber: string, kind: string, onMs: number | null, offMs: number | null) =>
  BleRingModule.sendTorchSms(phoneNumber, kind, onMs, offMs);
export const triggerTorch = (kind: string, onMs: number | null, offMs: number | null) =>
  BleRingModule.triggerTorch(kind, onMs, offMs);
export const triggerRing = () => BleRingModule.triggerRing();
export const stopRing = () => BleRingModule.stopRing();
export const setSilentRing = (silent: boolean) => BleRingModule.setSilentRing(silent);
export const isSilentRing = () => BleRingModule.isSilentRing();
export const stopTorch = () => BleRingModule.stopTorch();
export const hasRemoteControlAccess = () => BleRingModule.hasRemoteControlAccess();
export const requestRemoteControlAccess = () => BleRingModule.requestRemoteControlAccess();
export const setRingerMode = (mode: string) => BleRingModule.setRingerMode(mode);
export const setStreamVolume = (stream: 'ring' | 'notification' | 'media' | 'alarm', percent: number) =>
  BleRingModule.setStreamVolume(stream, percent);
export const getVolumeState = () => BleRingModule.getVolumeState();
export const hasBatteryOptimizationExemption = () => BleRingModule.hasBatteryOptimizationExemption();
export const requestBatteryOptimizationExemption = () => BleRingModule.requestBatteryOptimizationExemption();
export const setCustomRingtonePath = (path: string | null) => BleRingModule.setCustomRingtonePath(path);
export const setQuietHours = (startMinutes: number | null, endMinutes: number | null) =>
  BleRingModule.setQuietHours(startMinutes, endMinutes);

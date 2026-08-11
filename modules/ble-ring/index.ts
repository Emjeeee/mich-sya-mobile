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

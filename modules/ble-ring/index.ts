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
   * Starts the persistent foreground service that scans for the ring
   * signal in the background, even with the app fully closed. Reacts
   * entirely natively (sound/vibration/full-screen alert) -- deliberately
   * not dependent on the JS engine being alive, since that's exactly what
   * makes the internet-based ring path unreliable when the app is killed.
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
}

export const BleRingModule = requireNativeModule<BleRingModuleType>('BleRing');

export const broadcastRing = () => BleRingModule.broadcastRing();
export const startScanning = () => BleRingModule.startScanning();
export const stopScanning = () => BleRingModule.stopScanning();
export const isScanning = () => BleRingModule.isScanning();
export const sendRingSms = (phoneNumber: string) => BleRingModule.sendRingSms(phoneNumber);

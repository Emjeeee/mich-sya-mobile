import { PermissionsAndroid, Platform } from 'react-native';
import {
  broadcastRing as nativeBroadcastRing,
  broadcastTorch as nativeBroadcastTorch,
  sendRingSms as nativeSendRingSms,
  sendTorchSms as nativeSendTorchSms,
  startScanning as nativeStartScanning,
} from 'ble-ring';
import type { TorchPattern } from './torchPattern';

const BLE_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
];

// RECEIVE_SMS is needed so the OS actually invokes SmsRingReceiver on this
// device; SEND_SMS is needed to trigger the partner's phone. Requested
// together with the BLE permissions since both exist for the same reason:
// letting "Bunyikan HP pasangan" work without internet.
const SMS_PERMISSIONS = [PermissionsAndroid.PERMISSIONS.SEND_SMS, PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

// Needed so this device can react to a torch trigger (BLE/SMS/push) later --
// dangerous on every Android version since API 23, unlike BLE's API 31+
// cutoff, so it's always included below regardless of Platform.Version.
const CAMERA_PERMISSIONS = [PermissionsAndroid.PERMISSIONS.CAMERA];

// Android 12+ (API 31) requires the Bluetooth permissions to be
// runtime-requested "dangerous" permissions; below that, BLE scan/advertise
// are covered by the normal (install-time) BLUETOOTH/BLUETOOTH_ADMIN
// permissions plus the ACCESS_FINE_LOCATION the app already requests
// elsewhere for scanning. SMS permissions are always runtime-dangerous.
async function hasBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Platform.Version < 31) return true;

  for (const permission of BLE_PERMISSIONS) {
    if (!(await PermissionsAndroid.check(permission))) return false;
  }
  return true;
}

async function hasSmsPermission(permission: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(permission as never);
}

// Interactive -- shows the system permission dialogs, so this must only be
// called from a foreground context with a visible Activity (app startup).
// Calling this from a headless context (e.g. the widget's click handler)
// would have no Activity to attach the dialog to.
export async function requestOfflineRingPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const toRequest = Platform.Version >= 31
      ? [...BLE_PERMISSIONS, ...SMS_PERMISSIONS, ...CAMERA_PERMISSIONS]
      : [...SMS_PERMISSIONS, ...CAMERA_PERMISSIONS];
    await PermissionsAndroid.requestMultiple(toRequest);
  } catch {
    // Best-effort -- a denial just means that specific fallback won't work.
  }
}

// Called once at app startup -- requests permissions (interactive, safe here
// since the app is in the foreground) then arms the always-on background BLE
// listener so the offline ring works even with the app fully closed.
// Best-effort: if permissions are denied, this silently no-ops -- the
// internet-based ring path still works independently.
export async function startBleRingListener(): Promise<void> {
  try {
    await requestOfflineRingPermissions();
    if (!(await hasBlePermissions())) return;
    await nativeStartScanning();
  } catch {
    // Best-effort -- BLE isn't available on every device/emulator.
  }
}

// Meant to run alongside the internet-based ring push so "Bunyikan HP
// pasangan" works with or without a connection. Only checks (never
// requests) permissions, since this is also called from the headless widget
// click handler where there's no Activity to show a permission dialog on --
// the interactive request already happened at app startup via
// startBleRingListener(). Resolving `true` only means the advertisement
// went out, not that the partner's phone was actually in range to hear it --
// there's no way to know that synchronously with a connectionless broadcast.
export async function broadcastBleRing(): Promise<boolean> {
  try {
    if (!(await hasBlePermissions())) return false;
    return await nativeBroadcastRing();
  } catch {
    return false;
  }
}

// SMS fallback for when the partner's phone has cellular signal but no
// internet/data -- covers the case Bluetooth can't (no proximity needed).
// No-ops if there's no saved phone number for the partner, or if SEND_SMS
// hasn't been granted.
export async function broadcastSmsRing(phoneNumber: string | null): Promise<boolean> {
  if (!phoneNumber) return false;
  try {
    if (!(await hasSmsPermission(PermissionsAndroid.PERMISSIONS.SEND_SMS))) return false;
    return await nativeSendRingSms(phoneNumber);
  } catch {
    return false;
  }
}

// Torch equivalents of broadcastBleRing/broadcastSmsRing above -- same
// check-only (never request) permission handling, since these are also
// called from the headless widget click handler.
export async function broadcastBleTorch(pattern: TorchPattern): Promise<boolean> {
  try {
    if (!(await hasBlePermissions())) return false;
    return await nativeBroadcastTorch(pattern.kind, pattern.onMs ?? null, pattern.offMs ?? null);
  } catch {
    return false;
  }
}

export async function broadcastSmsTorch(phoneNumber: string | null, pattern: TorchPattern): Promise<boolean> {
  if (!phoneNumber) return false;
  try {
    if (!(await hasSmsPermission(PermissionsAndroid.PERMISSIONS.SEND_SMS))) return false;
    return await nativeSendTorchSms(phoneNumber, pattern.kind, pattern.onMs ?? null, pattern.offMs ?? null);
  } catch {
    return false;
  }
}

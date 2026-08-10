import { isSilentRing } from 'ble-ring';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { VolumeManager } from 'react-native-volume-manager';

const RING_SOUND = require('../../assets/sounds/marimba.wav');
const VOLUME_RAMP_STEPS = 10;
const VOLUME_RAMP_DURATION_MS = 3000;
const AUTO_STOP_MS = 60 * 1000;

let player: AudioPlayer | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;
let originalVolume: number | null = null;

async function rampVolumeToMax() {
  try {
    const { volume } = await VolumeManager.getVolume();
    originalVolume = volume;
    for (let step = 1; step <= VOLUME_RAMP_STEPS; step++) {
      const target = volume + ((1 - volume) * step) / VOLUME_RAMP_STEPS;
      await VolumeManager.setVolume(target, { type: 'music' });
      await new Promise((resolve) => setTimeout(resolve, VOLUME_RAMP_DURATION_MS / VOLUME_RAMP_STEPS));
    }
  } catch {
    // Volume control isn't guaranteed on every device -- the sound itself still plays.
  }
}

export async function playRingtone() {
  if (player) return; // already ringing
  if (await isSilentRing().catch(() => false)) return; // vibration/notification still happen elsewhere

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });

  player = createAudioPlayer(RING_SOUND);
  player.loop = true;
  player.play();

  rampVolumeToMax();

  autoStopTimer = setTimeout(stopRingtone, AUTO_STOP_MS);
}

export function stopRingtone() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (player) {
    player.pause();
    player.remove();
    player = null;
  }
  if (originalVolume !== null) {
    VolumeManager.setVolume(originalVolume, { type: 'music' }).catch(() => {});
    originalVolume = null;
  }
}

export function isRinging(): boolean {
  return player !== null;
}

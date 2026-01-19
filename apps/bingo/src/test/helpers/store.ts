import { useGameStore } from '@/stores/game-store';
import { useSyncStore } from '@/stores/sync-store';
import { useAudioStore, DEFAULT_VOICE_VOLUME, DEFAULT_ROLL_SOUND_VOLUME, DEFAULT_CHIME_VOLUME, DEFAULT_VOICE_PACK } from '@/stores/audio-store';
import { createInitialState } from '@/lib/game';

/**
 * Reset the game store to its initial state.
 */
export function resetGameStore(): void {
  useGameStore.setState(createInitialState());
}

/**
 * Reset the sync store to its initial state.
 */
export function resetSyncStore(): void {
  useSyncStore.getState().reset();
}

/**
 * Reset the audio store to its initial state.
 * Note: Audio store uses persist middleware, so we need to reset carefully.
 */
export function resetAudioStore(): void {
  useAudioStore.setState({
    enabled: true,
    voiceVolume: DEFAULT_VOICE_VOLUME,
    rollSoundVolume: DEFAULT_ROLL_SOUND_VOLUME,
    chimeVolume: DEFAULT_CHIME_VOLUME,
    isPlaying: false,
    voicePack: DEFAULT_VOICE_PACK,
    useFallbackTTS: true,
    manifest: null,
  });
}

/**
 * Reset all stores to their initial states.
 */
export function resetAllStores(): void {
  resetGameStore();
  resetSyncStore();
  resetAudioStore();
}

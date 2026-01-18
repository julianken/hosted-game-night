import { useEffect, useRef } from 'react';
import { useAudioStore } from '@/stores/audio-store';

/**
 * Hook to trigger audio preloading after React mount.
 * Fix #1: Ensures preloading happens after localStorage rehydration.
 *
 * This hook should be called in the presenter component to preload
 * the current voice pack. It automatically handles:
 * - Initial preload after mount
 * - Re-preloading when voice pack changes
 * - Cleanup of audio elements on unmount
 */
export function useAudioPreload() {
  const voicePack = useAudioStore((s) => s.voicePack);
  const preloadVoicePack = useAudioStore((s) => s.preloadVoicePack);
  const clearPreloadedAudio = useAudioStore((s) => s.clearPreloadedAudio);
  const preloadProgress = useAudioStore((s) => s.preloadProgress);
  const preloadError = useAudioStore((s) => s.preloadError);

  // Track if this is the first mount to avoid duplicate preloads
  const hasPreloaded = useRef(false);
  const currentPack = useRef(voicePack);

  useEffect(() => {
    // Preload on mount or when voice pack changes
    if (!hasPreloaded.current || currentPack.current !== voicePack) {
      hasPreloaded.current = true;
      currentPack.current = voicePack;
      preloadVoicePack(voicePack);
    }

    // Cleanup on unmount
    return () => {
      clearPreloadedAudio();
    };
  }, [voicePack, preloadVoicePack, clearPreloadedAudio]);

  return {
    preloadProgress,
    preloadError,
    isPreloading: preloadProgress > 0 && preloadProgress < 100,
    isPreloaded: preloadProgress === 100,
  };
}

/**
 * Hook to get the current audio state and controls.
 * Provides a simplified interface for components that need audio functionality.
 */
export function useAudio() {
  const enabled = useAudioStore((s) => s.enabled);
  const volume = useAudioStore((s) => s.volume);
  const voicePack = useAudioStore((s) => s.voicePack);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const useFallbackTTS = useAudioStore((s) => s.useFallbackTTS);

  const setEnabled = useAudioStore((s) => s.setEnabled);
  const toggleEnabled = useAudioStore((s) => s.toggleEnabled);
  const setVolume = useAudioStore((s) => s.setVolume);
  const setVoicePack = useAudioStore((s) => s.setVoicePack);
  const setUseFallbackTTS = useAudioStore((s) => s.setUseFallbackTTS);
  const playBallCall = useAudioStore((s) => s.playBallCall);
  const stopPlayback = useAudioStore((s) => s.stopPlayback);

  return {
    // State
    enabled,
    volume,
    voicePack,
    isPlaying,
    useFallbackTTS,

    // Actions
    setEnabled,
    toggleEnabled,
    setVolume,
    setVoicePack,
    setUseFallbackTTS,
    playBallCall,
    stopPlayback,
  };
}

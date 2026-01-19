import { useEffect, useRef } from 'react';
import { useAudioStore } from '@/stores/audio-store';
import { useSWCache } from './use-sw-cache';

/**
 * Hook to trigger audio preloading after React mount.
 * Uses the Service Worker cache for preloading voice packs.
 *
 * This hook should be called in the presenter component to preload
 * the current voice pack. It automatically handles:
 * - Initial preload after mount
 * - Re-preloading when voice pack changes
 */
export function useAudioPreload() {
  const voicePack = useAudioStore((s) => s.voicePack);
  const loadManifest = useAudioStore((s) => s.loadManifest);
  const { preload, preloadProgress, isPreloading, cachedPacks } = useSWCache();

  // Track current pack to detect changes
  const currentPack = useRef(voicePack);

  useEffect(() => {
    // Load the manifest first
    loadManifest();
  }, [loadManifest]);

  useEffect(() => {
    // Preload when voice pack changes and it's not already cached
    if (currentPack.current !== voicePack || !cachedPacks.includes(voicePack)) {
      currentPack.current = voicePack;
      preload(voicePack);
    }
  }, [voicePack, preload, cachedPacks]);

  return {
    preloadProgress,
    isPreloading,
    isPreloaded: cachedPacks.includes(voicePack),
  };
}

/**
 * Hook to get the current audio state and controls.
 * Provides a simplified interface for components that need audio functionality.
 */
export function useAudio() {
  const enabled = useAudioStore((s) => s.enabled);
  const voiceVolume = useAudioStore((s) => s.voiceVolume);
  const rollSoundVolume = useAudioStore((s) => s.rollSoundVolume);
  const chimeVolume = useAudioStore((s) => s.chimeVolume);
  const voicePack = useAudioStore((s) => s.voicePack);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const useFallbackTTS = useAudioStore((s) => s.useFallbackTTS);

  const setEnabled = useAudioStore((s) => s.setEnabled);
  const toggleEnabled = useAudioStore((s) => s.toggleEnabled);
  const setVoiceVolume = useAudioStore((s) => s.setVoiceVolume);
  const setRollSoundVolume = useAudioStore((s) => s.setRollSoundVolume);
  const setChimeVolume = useAudioStore((s) => s.setChimeVolume);
  const setVoicePack = useAudioStore((s) => s.setVoicePack);
  const setUseFallbackTTS = useAudioStore((s) => s.setUseFallbackTTS);
  const playBallCall = useAudioStore((s) => s.playBallCall);
  const stopPlayback = useAudioStore((s) => s.stopPlayback);

  return {
    // State
    enabled,
    voiceVolume,
    rollSoundVolume,
    chimeVolume,
    voicePack,
    isPlaying,
    useFallbackTTS,

    // Actions
    setEnabled,
    toggleEnabled,
    setVoiceVolume,
    setRollSoundVolume,
    setChimeVolume,
    setVoicePack,
    setUseFallbackTTS,
    playBallCall,
    stopPlayback,
  };
}

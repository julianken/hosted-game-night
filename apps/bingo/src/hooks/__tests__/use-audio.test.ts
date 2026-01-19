import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioPreload, useAudio } from '../use-audio';
import { useAudioStore } from '@/stores/audio-store';

// Mock the use-sw-cache hook
vi.mock('../use-sw-cache', () => ({
  useSWCache: vi.fn(() => ({
    preload: vi.fn(),
    preloadProgress: 0,
    isPreloading: false,
    cachedPacks: [],
  })),
}));

// Import the mocked module
import { useSWCache } from '../use-sw-cache';

describe('use-audio', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected console.error from loadManifest failures
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset audio store to default state
    useAudioStore.setState({
      enabled: true,
      voiceVolume: 0.7,
      rollSoundVolume: 0.8,
      chimeVolume: 0.8,
      voicePack: 'standard',
      useFallbackTTS: true,
      rollSoundType: 'metal-cage',
      rollDuration: '2s',
      revealChime: 'none',
      isPlaying: false,
      manifest: null,
    });

    // Reset the mock
    vi.mocked(useSWCache).mockReturnValue({
      preload: vi.fn(),
      preloadProgress: 0,
      isPreloading: false,
      cachedPacks: [],
      isSupported: true,
      totalFiles: 0,
      clearCache: vi.fn(),
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('useAudioPreload', () => {
    it('loads manifest on mount', async () => {
      const loadManifestSpy = vi.spyOn(useAudioStore.getState(), 'loadManifest');

      renderHook(() => useAudioPreload());

      await waitFor(() => {
        expect(loadManifestSpy).toHaveBeenCalled();
      });
    });

    it('preloads voice pack on mount', async () => {
      const mockPreload = vi.fn();
      vi.mocked(useSWCache).mockReturnValue({
        preload: mockPreload,
        preloadProgress: 0,
        isPreloading: false,
        cachedPacks: [],
        isSupported: true,
        totalFiles: 0,
        clearCache: vi.fn(),
        refresh: vi.fn(),
      });

      renderHook(() => useAudioPreload());

      await waitFor(() => {
        expect(mockPreload).toHaveBeenCalledWith('standard');
      });
    });

    it('re-preloads on voice pack change', async () => {
      const mockPreload = vi.fn();
      vi.mocked(useSWCache).mockReturnValue({
        preload: mockPreload,
        preloadProgress: 0,
        isPreloading: false,
        cachedPacks: [],
        isSupported: true,
        totalFiles: 0,
        clearCache: vi.fn(),
        refresh: vi.fn(),
      });

      renderHook(() => useAudioPreload());

      // Initial preload
      await waitFor(() => {
        expect(mockPreload).toHaveBeenCalledWith('standard');
      });

      // Change voice pack
      act(() => {
        useAudioStore.setState({ voicePack: 'british' });
      });

      await waitFor(() => {
        expect(mockPreload).toHaveBeenCalledWith('british');
      });
    });

    it('skips preload if already cached', async () => {
      const mockPreload = vi.fn();
      vi.mocked(useSWCache).mockReturnValue({
        preload: mockPreload,
        preloadProgress: 0,
        isPreloading: false,
        cachedPacks: ['standard'], // Already cached
        isSupported: true,
        totalFiles: 75,
        clearCache: vi.fn(),
        refresh: vi.fn(),
      });

      const { rerender } = renderHook(() => useAudioPreload());

      // Force re-render to trigger the effect again
      rerender();

      // Since 'standard' is already in cachedPacks and the currentPack ref matches voicePack,
      // on initial render, currentPack.current equals voicePack (both 'standard'),
      // and cachedPacks includes 'standard', so the condition is false and preload is not called.
      // However, on first render, the ref is initialized to voicePack, so the condition
      // `currentPack.current !== voicePack` is false initially, and `!cachedPacks.includes(voicePack)`
      // is also false since it's already cached. Therefore, preload is never called.
      expect(mockPreload).not.toHaveBeenCalled();
    });

    it('returns progress, isPreloading, and isPreloaded', () => {
      vi.mocked(useSWCache).mockReturnValue({
        preload: vi.fn(),
        preloadProgress: 50,
        isPreloading: true,
        cachedPacks: [],
        isSupported: true,
        totalFiles: 0,
        clearCache: vi.fn(),
        refresh: vi.fn(),
      });

      const { result } = renderHook(() => useAudioPreload());

      expect(result.current.preloadProgress).toBe(50);
      expect(result.current.isPreloading).toBe(true);
      expect(result.current.isPreloaded).toBe(false);
    });

    it('returns isPreloaded as true when current pack is cached', () => {
      vi.mocked(useSWCache).mockReturnValue({
        preload: vi.fn(),
        preloadProgress: 100,
        isPreloading: false,
        cachedPacks: ['standard'],
        isSupported: true,
        totalFiles: 75,
        clearCache: vi.fn(),
        refresh: vi.fn(),
      });

      const { result } = renderHook(() => useAudioPreload());

      expect(result.current.isPreloaded).toBe(true);
    });
  });

  describe('useAudio', () => {
    it('returns all audio state', () => {
      useAudioStore.setState({
        enabled: true,
        voiceVolume: 0.75,
        rollSoundVolume: 0.9,
        chimeVolume: 0.85,
        voicePack: 'british',
        isPlaying: true,
        useFallbackTTS: false,
      });

      const { result } = renderHook(() => useAudio());

      expect(result.current.enabled).toBe(true);
      expect(result.current.voiceVolume).toBe(0.75);
      expect(result.current.rollSoundVolume).toBe(0.9);
      expect(result.current.chimeVolume).toBe(0.85);
      expect(result.current.voicePack).toBe('british');
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.useFallbackTTS).toBe(false);
    });

    it('returns all audio control functions', () => {
      const { result } = renderHook(() => useAudio());

      expect(typeof result.current.setEnabled).toBe('function');
      expect(typeof result.current.toggleEnabled).toBe('function');
      expect(typeof result.current.setVoiceVolume).toBe('function');
      expect(typeof result.current.setRollSoundVolume).toBe('function');
      expect(typeof result.current.setChimeVolume).toBe('function');
      expect(typeof result.current.setVoicePack).toBe('function');
      expect(typeof result.current.setUseFallbackTTS).toBe('function');
      expect(typeof result.current.playBallCall).toBe('function');
      expect(typeof result.current.stopPlayback).toBe('function');
    });

    it('setEnabled updates enabled state', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.enabled).toBe(false);
    });

    it('toggleEnabled toggles enabled state', () => {
      const { result } = renderHook(() => useAudio());

      expect(result.current.enabled).toBe(true);

      act(() => {
        result.current.toggleEnabled();
      });

      expect(result.current.enabled).toBe(false);

      act(() => {
        result.current.toggleEnabled();
      });

      expect(result.current.enabled).toBe(true);
    });

    it('setVoiceVolume updates voice volume', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setVoiceVolume(0.5);
      });

      expect(result.current.voiceVolume).toBe(0.5);
    });

    it('setRollSoundVolume updates roll sound volume', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setRollSoundVolume(0.6);
      });

      expect(result.current.rollSoundVolume).toBe(0.6);
    });

    it('setChimeVolume updates chime volume', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setChimeVolume(0.5);
      });

      expect(result.current.chimeVolume).toBe(0.5);
    });

    it('setVoiceVolume clamps volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setVoiceVolume(1.5);
      });

      expect(result.current.voiceVolume).toBe(1);

      act(() => {
        result.current.setVoiceVolume(-0.5);
      });

      expect(result.current.voiceVolume).toBe(0);
    });

    it('setRollSoundVolume clamps volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setRollSoundVolume(1.5);
      });

      expect(result.current.rollSoundVolume).toBe(1);

      act(() => {
        result.current.setRollSoundVolume(-0.5);
      });

      expect(result.current.rollSoundVolume).toBe(0);
    });

    it('setChimeVolume clamps volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setChimeVolume(1.5);
      });

      expect(result.current.chimeVolume).toBe(1);

      act(() => {
        result.current.setChimeVolume(-0.5);
      });

      expect(result.current.chimeVolume).toBe(0);
    });

    it('setVoicePack updates voice pack', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setVoicePack('british-hall');
      });

      expect(result.current.voicePack).toBe('british-hall');
    });

    it('setUseFallbackTTS updates useFallbackTTS', () => {
      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.setUseFallbackTTS(false);
      });

      expect(result.current.useFallbackTTS).toBe(false);
    });

    it('stopPlayback cancels speech synthesis and sets isPlaying to false', () => {
      // Mock speechSynthesis
      const cancelMock = vi.fn();
      vi.stubGlobal('speechSynthesis', { cancel: cancelMock });

      useAudioStore.setState({ isPlaying: true });

      const { result } = renderHook(() => useAudio());

      act(() => {
        result.current.stopPlayback();
      });

      expect(cancelMock).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);

      vi.unstubAllGlobals();
    });
  });
});

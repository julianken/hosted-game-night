/**
 * Sound Manager for Trivia
 *
 * Handles sound effect playback with preloading, pooling, and Web Audio API support.
 * Similar to Bingo's audio system but tailored for trivia game events.
 */

// =============================================================================
// TYPES
// =============================================================================

export type SoundEffectType =
  | 'timer-tick' // Timer tick (last 5 seconds)
  | 'timer-expired' // Timer reached zero (buzzer)
  | 'correct-answer' // Correct answer chime
  | 'wrong-answer' // Wrong answer buzz
  | 'question-reveal' // New question reveal
  | 'round-complete' // Round finished fanfare
  | 'game-win'; // Game win celebration

export interface SoundManagerConfig {
  volume: number; // Master volume 0-1
  enabled: boolean;
}

interface PooledAudio {
  element: HTMLAudioElement;
  inUse: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Sound effect file paths.
 * These map to files in public/audio/sfx/
 */
export const SOUND_EFFECT_PATHS = {
  'timer-tick': '/audio/sfx/timer-tick.mp3',
  'timer-expired': '/audio/sfx/timer-expired.mp3',
  'correct-answer': '/audio/sfx/correct-answer.mp3',
  'wrong-answer': '/audio/sfx/wrong-answer.mp3',
  'question-reveal': '/audio/sfx/question-reveal.mp3',
  'round-complete': '/audio/sfx/round-complete.mp3',
  'game-win': '/audio/sfx/game-win.mp3',
} as const satisfies Record<SoundEffectType, string>;

/**
 * All available sound effect types.
 */
export const ALL_SOUND_EFFECTS: SoundEffectType[] = Object.keys(
  SOUND_EFFECT_PATHS
) as SoundEffectType[];

// =============================================================================
// AUDIO POOL MANAGEMENT
// =============================================================================

// Pool of audio elements for each sound (prevents memory leaks)
const soundPools: Map<string, PooledAudio[]> = new Map();
const POOL_SIZE = 3; // Allow multiple overlapping sounds

// Track all active audio elements
const activeAudioElements: Set<HTMLAudioElement> = new Set();

// Track preloaded sounds
const preloadedSounds: Set<string> = new Set();

/**
 * Check if we're in a browser environment with Audio support.
 */
export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

/**
 * Get or create a pooled audio element for a sound file.
 */
function getPooledAudio(soundFile: string): HTMLAudioElement | null {
  if (!isAudioSupported()) {
    return null;
  }

  // Get or create pool for this sound
  if (!soundPools.has(soundFile)) {
    soundPools.set(soundFile, []);
  }

  const pool = soundPools.get(soundFile)!;

  // Find an available element
  for (const pooled of pool) {
    if (!pooled.inUse) {
      pooled.inUse = true;
      pooled.element.currentTime = 0;
      activeAudioElements.add(pooled.element);
      return pooled.element;
    }
  }

  // Create new element if pool isn't full
  if (pool.length < POOL_SIZE) {
    const element = new Audio(soundFile);
    element.preload = 'auto';
    const pooled: PooledAudio = { element, inUse: true };
    pool.push(pooled);
    activeAudioElements.add(element);
    return element;
  }

  // Pool full - create temporary element
  const tempElement = new Audio(soundFile);
  activeAudioElements.add(tempElement);
  return tempElement;
}

/**
 * Release a pooled audio element back to the pool.
 */
function releasePooledAudio(soundFile: string, element: HTMLAudioElement): void {
  activeAudioElements.delete(element);

  const pool = soundPools.get(soundFile);
  if (pool) {
    const pooled = pool.find((p) => p.element === element);
    if (pooled) {
      pooled.inUse = false;
      return;
    }
  }

  // Not from pool (temporary) - clean it up
  cleanupAudioElement(element);
}

/**
 * Clean up an audio element to release memory.
 */
function cleanupAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  audio.oncanplaythrough = null;
  audio.src = '';
  audio.load();
  activeAudioElements.delete(audio);
}

// =============================================================================
// SOUND MANAGER CLASS
// =============================================================================

/**
 * Sound Manager handles all sound effect operations.
 */
export class SoundManager {
  private config: SoundManagerConfig = {
    volume: 0.8,
    enabled: true,
  };

  /**
   * Update the sound manager configuration.
   */
  configure(config: Partial<SoundManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): SoundManagerConfig {
    return { ...this.config };
  }

  /**
   * Check if sounds are enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled && isAudioSupported();
  }

  /**
   * Preload all sound effects.
   * Call this early (e.g., on page load) to cache sounds.
   */
  async preloadAll(): Promise<void> {
    if (!isAudioSupported()) {
      return;
    }

    const preloadPromises = ALL_SOUND_EFFECTS.map((effect) =>
      this.preloadSound(effect)
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Preload a specific sound effect.
   */
  async preloadSound(effect: SoundEffectType): Promise<void> {
    const soundFile = SOUND_EFFECT_PATHS[effect];

    if (preloadedSounds.has(soundFile)) {
      return; // Already preloaded
    }

    return new Promise<void>((resolve) => {
      if (!isAudioSupported()) {
        resolve();
        return;
      }

      const audio = new Audio(soundFile);
      audio.preload = 'auto';

      audio.oncanplaythrough = () => {
        preloadedSounds.add(soundFile);
        audio.oncanplaythrough = null;
        audio.onerror = null;
        resolve();
      };

      audio.onerror = () => {
        console.warn(`Failed to preload sound: ${effect}`);
        audio.oncanplaythrough = null;
        audio.onerror = null;
        resolve();
      };

      // Start loading
      audio.load();
    });
  }

  /**
   * Check if a sound is preloaded.
   */
  isPreloaded(effect: SoundEffectType): boolean {
    return preloadedSounds.has(SOUND_EFFECT_PATHS[effect]);
  }

  /**
   * Get the count of preloaded sounds.
   */
  getPreloadedCount(): number {
    return preloadedSounds.size;
  }

  /**
   * Play a sound effect.
   * Returns a promise that resolves when the sound finishes or fails.
   */
  async play(effect: SoundEffectType, volumeOverride?: number): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const soundFile = SOUND_EFFECT_PATHS[effect];
    const audio = getPooledAudio(soundFile);

    if (!audio) {
      return;
    }

    // Set volume (override or use config)
    const volume = volumeOverride ?? this.config.volume;
    audio.volume = Math.max(0, Math.min(1, volume));

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        releasePooledAudio(soundFile, audio);
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        console.warn(`Failed to play sound effect: ${effect}`);
        resolve();
      };

      audio.play().catch(() => {
        cleanup();
        resolve();
      });
    });
  }

  /**
   * Play a sound effect without waiting for it to complete.
   * Useful for rapid-fire sounds like timer ticks.
   */
  playFireAndForget(effect: SoundEffectType, volumeOverride?: number): void {
    this.play(effect, volumeOverride).catch(() => {
      // Ignore errors for fire-and-forget
    });
  }

  /**
   * Stop all currently playing sounds.
   */
  stopAll(): void {
    for (const element of activeAudioElements) {
      element.pause();
      element.currentTime = 0;
    }
  }

  /**
   * Clean up all audio resources.
   * Call this when unmounting or cleaning up.
   */
  cleanup(): void {
    // Stop all sounds
    this.stopAll();

    // Clean up all pools
    for (const [, pool] of soundPools) {
      for (const pooled of pool) {
        cleanupAudioElement(pooled.element);
      }
    }
    soundPools.clear();

    // Clean up any remaining active elements
    for (const element of activeAudioElements) {
      cleanupAudioElement(element);
    }
    activeAudioElements.clear();

    // Clear preloaded tracking
    preloadedSounds.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global sound manager instance.
 * Use this for all sound operations.
 */
export const soundManager = new SoundManager();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the count of active audio elements (for testing).
 */
export function getActiveAudioCount(): number {
  return activeAudioElements.size;
}

/**
 * Clean up all pools (for testing).
 */
export function cleanupAllPools(): void {
  soundManager.cleanup();
}

// =============================================================================
// WEB AUDIO API TONE GENERATOR (Fallback/Development)
// =============================================================================

/**
 * AudioContext for generating placeholder tones.
 * Used when sound files aren't available.
 */
let audioContext: AudioContext | null = null;

/**
 * Get or create the AudioContext.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  return audioContext;
}

/**
 * Tone presets for different sound effects.
 */
interface TonePreset {
  frequency: number;
  duration: number;
  type: OscillatorType;
  decay?: boolean;
}

const TONE_PRESETS = {
  'timer-tick': { frequency: 800, duration: 0.05, type: 'sine' },
  'timer-expired': { frequency: 200, duration: 0.5, type: 'sawtooth', decay: true },
  'correct-answer': { frequency: 880, duration: 0.2, type: 'sine' },
  'wrong-answer': { frequency: 220, duration: 0.3, type: 'square', decay: true },
  'question-reveal': { frequency: 660, duration: 0.15, type: 'sine' },
  'round-complete': { frequency: 523, duration: 0.4, type: 'sine' },
  'game-win': { frequency: 784, duration: 0.6, type: 'sine' },
} as const satisfies Record<SoundEffectType, TonePreset>;

/**
 * Play a generated tone as fallback.
 * Use this for development or when sound files aren't available.
 */
export async function playTone(
  effect: SoundEffectType,
  volume: number = 0.5
): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  // Resume context if suspended (autoplay policy)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const preset = TONE_PRESETS[effect];
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = preset.type;
  oscillator.frequency.value = preset.frequency;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.value = volume;

  if (preset.decay) {
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + preset.duration
    );
  }

  oscillator.start();
  oscillator.stop(ctx.currentTime + preset.duration);

  return new Promise<void>((resolve) => {
    oscillator.onended = () => resolve();
  });
}

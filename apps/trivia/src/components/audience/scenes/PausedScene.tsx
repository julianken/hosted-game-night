'use client';

import { useGameStore } from '@/stores/game-store';
import { PauseOverlay } from '@/components/audience/PauseOverlay';

/**
 * PausedScene (T1.9)
 *
 * Wraps the existing PauseOverlay component.
 * Reads emergencyBlank and timer state from the game store.
 *
 * In normal pause mode: shows "Game Paused" message with frozen timer.
 * When emergencyBlank is true: PauseOverlay renders a fully blank screen.
 */
export function PausedScene() {
  const emergencyBlank = useGameStore((state) => state.emergencyBlank);
  const timer = useGameStore((state) => state.timer);

  return <PauseOverlay emergencyBlank={emergencyBlank} timer={timer} />;
}

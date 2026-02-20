'use client';

/**
 * T4.6: PresenterActionBar
 *
 * Extracted bottom action bar from play/page.tsx.
 * Shows game controls based on current game status and scene.
 *
 * During setup:     nothing (start happens in wizard)
 * During gameplay:  Complete Round, Next Round, Resume, Pause, Emergency
 */

import type { GameStatus } from '@/types';

export interface PresenterActionBarProps {
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  isLastRound: boolean;
  isLastQuestionOfRound: boolean;
  emergencyBlank: boolean;
  onCompleteRound: () => void;
  onNextRound: () => void;
  onShowSummary: () => void;
  onResumeGame: () => void;
  onPauseGame: () => void;
  onEmergencyPause: () => void;
}

export function PresenterActionBar({
  status,
  currentRound,
  totalRounds,
  isLastRound,
  isLastQuestionOfRound,
  emergencyBlank,
  onCompleteRound,
  onNextRound,
  onShowSummary,
  onResumeGame,
  onPauseGame,
  onEmergencyPause,
}: PresenterActionBarProps) {
  return (
    <footer
      className="flex-shrink-0 flex items-center justify-between px-4 border-t border-border bg-surface/80"
      style={{ backdropFilter: 'blur(8px)', height: '64px' }}
    >
      {/* Left: round context */}
      <div className="text-sm text-foreground-secondary font-medium">
        {status === 'playing' && (
          <span>Round {currentRound + 1} / {totalRounds}</span>
        )}
      </div>

      {/* Center: primary action buttons */}
      <div className="flex items-center gap-2">
        {/* Last question of round */}
        {status === 'playing' && isLastQuestionOfRound && (
          <button
            onClick={onCompleteRound}
            className="px-4 py-2 rounded-lg text-sm font-semibold
              bg-warning/20 hover:bg-warning/30 text-warning
              border border-warning/30 transition-colors min-h-[44px]"
          >
            Complete Round
          </button>
        )}

        {/* Between rounds */}
        {status === 'between_rounds' && (
          <>
            <button
              onClick={onShowSummary}
              className="px-4 py-2 rounded-lg text-sm font-medium
                bg-surface-elevated hover:bg-surface-hover text-foreground
                border border-border transition-colors min-h-[44px]"
            >
              Show Summary
            </button>
            <button
              onClick={onNextRound}
              className="px-4 py-2 rounded-lg text-sm font-semibold
                bg-success hover:bg-success/90 text-success-foreground
                transition-colors min-h-[44px]"
            >
              {isLastRound ? 'End Game' : 'Next Round'}
            </button>
          </>
        )}

        {/* Paused state */}
        {status === 'paused' && (
          <>
            {emergencyBlank && (
              <button
                onClick={onEmergencyPause}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-error/20 hover:bg-error/30 text-error
                  border border-error/30 transition-colors min-h-[44px]"
              >
                Clear Emergency
              </button>
            )}
            <button
              onClick={onResumeGame}
              className="px-4 py-2 rounded-lg text-sm font-semibold
                bg-success hover:bg-success/90 text-success-foreground
                transition-colors min-h-[44px]"
            >
              Resume
            </button>
          </>
        )}
      </div>

      {/* Right: Pause + Emergency */}
      <div className="flex items-center gap-2">
        {(status === 'playing' || status === 'between_rounds') && (
          <>
            <button
              onClick={onPauseGame}
              className="px-3 py-2 rounded-lg text-sm font-medium
                bg-warning/15 hover:bg-warning/25 text-warning
                border border-warning/30 flex items-center gap-1.5
                transition-colors min-h-[44px]"
              title="Pause game (P)"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
            <button
              onClick={onEmergencyPause}
              className="px-3 py-2 rounded-lg text-sm font-medium
                bg-error/15 hover:bg-error/25 text-error
                border border-error/30 flex items-center gap-1.5
                transition-colors min-h-[44px]"
              title="Emergency pause — blanks display (E)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Emergency
            </button>
          </>
        )}
      </div>
    </footer>
  );
}

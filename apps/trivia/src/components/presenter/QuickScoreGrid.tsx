'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Team } from '@/types';
import type { UseQuickScoreReturn } from '@/hooks/use-quick-score';
import { getTeamColor } from '@/lib/motion/team-colors';
import { springUrgent } from '@/lib/motion/presets';

export interface QuickScoreGridProps {
  teams: Team[];
  quickScore: UseQuickScoreReturn;
}

/**
 * Keyboard hint labels: 1-9 for first 9 teams, 0 for the 10th.
 */
function getKeyHint(index: number): string {
  if (index < 9) return String(index + 1);
  if (index === 9) return '0';
  return '';
}

/**
 * QuickScoreGrid (T2.5)
 *
 * Presenter-side 3xN grid of toggle buttons for quick team scoring.
 * Each button maps to a keyboard shortcut (1-9, 0) and shows the team name,
 * current score, and active state (team scored this question).
 *
 * Active state: colored border + subtle background using getTeamColor().
 * Inactive state: default border.
 *
 * Minimum button size: 44x44px (accessibility requirement).
 * Shows scored count summary ("3/6 scored").
 */
export function QuickScoreGrid({ teams, quickScore }: QuickScoreGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const scoredCount = quickScore.scoredTeamIds.size;

  return (
    <div className="flex flex-col gap-3">
      {/* Header with scored count */}
      <div className="flex items-center justify-between">
        <h3
          className="font-semibold text-foreground"
          style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}
        >
          Quick Score
        </h3>
        <span
          className="text-foreground-secondary tabular-nums"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
          aria-live="polite"
          aria-label={`${scoredCount} of ${teams.length} teams scored`}
        >
          {scoredCount}/{teams.length} scored
        </span>
      </div>

      {/* Team buttons grid — 3 columns */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        role="group"
        aria-label="Quick score team buttons"
      >
        {teams.map((team, index) => {
          const isScored = quickScore.isTeamScored(team.id);
          const teamColor = getTeamColor(index);
          const keyHint = getKeyHint(index);
          // Only show key hints for first 10 teams
          const showKeyHint = index < 10;

          return (
            <motion.button
              key={team.id}
              onClick={() => quickScore.toggleTeam(team.id)}
              aria-pressed={isScored}
              aria-label={`${team.name} — ${team.score} points${isScored ? ' (scored)' : ''}${showKeyHint ? `. Press ${keyHint} to toggle.` : ''}`}
              whileTap={
                shouldReduceMotion
                  ? {}
                  : { scale: 0.94, transition: springUrgent }
              }
              className="relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{
                minHeight: '64px',
                minWidth: '44px',
                padding: '8px 6px',
                borderColor: isScored ? teamColor.bg : 'rgba(255, 255, 255, 0.12)',
                background: isScored ? teamColor.subtle : 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
              }}
            >
              {/* Keyboard hint badge */}
              {showKeyHint && (
                <span
                  className="absolute top-1 left-1 inline-flex items-center justify-center rounded font-mono font-bold leading-none"
                  aria-hidden="true"
                  style={{
                    fontSize: '0.625rem',
                    width: '16px',
                    height: '16px',
                    background: isScored ? teamColor.bg : 'rgba(255, 255, 255, 0.15)',
                    color: isScored ? teamColor.fg : 'var(--foreground-secondary)',
                  }}
                >
                  {keyHint}
                </span>
              )}

              {/* Team name */}
              <span
                className="font-semibold text-center leading-tight truncate w-full text-center"
                style={{
                  fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)',
                  color: isScored ? teamColor.bg : 'var(--foreground)',
                }}
              >
                {team.name}
              </span>

              {/* Score */}
              <span
                className="tabular-nums font-bold"
                style={{
                  fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                  color: isScored ? teamColor.bg : 'var(--foreground-secondary)',
                  fontFamily: 'var(--font-display)',
                }}
                aria-hidden="true"
              >
                {team.score}
              </span>

              {/* Scored indicator dot */}
              {isScored && (
                <div
                  className="absolute bottom-1 right-1 rounded-full"
                  aria-hidden="true"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: teamColor.bg,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Undo button */}
      {quickScore.scoredTeamIds.size > 0 && (
        <button
          onClick={() => quickScore.undo()}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-2 px-3 text-foreground-secondary hover:text-foreground hover:border-foreground-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{
            fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
            minHeight: '44px',
          }}
          aria-label="Undo last score action (Ctrl+Z)"
        >
          <span aria-hidden="true">↩</span>
          <span>Undo</span>
          <kbd
            className="rounded border px-1 font-mono text-xs"
            style={{
              borderColor: 'rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
            }}
            aria-hidden="true"
          >
            Ctrl+Z
          </kbd>
        </button>
      )}
    </div>
  );
}

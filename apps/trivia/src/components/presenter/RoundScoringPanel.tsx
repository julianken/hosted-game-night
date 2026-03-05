'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Team } from '@/types';
import { getTeamColor } from '@/lib/motion/team-colors';

export interface RoundScoringPanelProps {
  teams: Team[];
  currentRound: number;
  onSubmitScores: (scores: Record<string, number>) => void;
  onProgressChange?: (entries: Record<string, number>) => void;
}

interface UndoEntry {
  teamId: string;
  previousValue: number | null;
}

/**
 * RoundScoringPanel
 *
 * Facilitator UI for entering per-team round scores during the `round_scoring` scene.
 * Shows a team list with number inputs, progress counter, undo support, and a Done button.
 *
 * Design requirements:
 * - Large touch targets (min 44x44px)
 * - Team accent colors via getTeamColor()
 * - Ctrl+Z undo for last entry
 * - Progress: "X/N teams entered"
 */
export function RoundScoringPanel({
  teams,
  currentRound,
  onSubmitScores,
  onProgressChange,
}: RoundScoringPanelProps) {
  const [entries, setEntries] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    for (const team of teams) {
      initial[team.id] = null;
    }
    return initial;
  });

  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const enteredCount = Object.values(entries).filter((v) => v !== null).length;
  const allEntered = enteredCount === teams.length;
  const roundNumber = currentRound + 1;

  // Sync progress to audience display via store
  useEffect(() => {
    if (!onProgressChange) return;
    const filled: Record<string, number> = {};
    for (const [teamId, value] of Object.entries(entries)) {
      if (value !== null) {
        filled[teamId] = value;
      }
    }
    onProgressChange(filled);
  }, [entries, onProgressChange]);

  // Sort teams by current total score descending (highest first)
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  const handleScoreChange = useCallback(
    (teamId: string, value: string) => {
      const numValue = value === '' ? null : Math.max(0, parseInt(value, 10));
      if (value !== '' && isNaN(parseInt(value, 10))) return;

      setUndoStack((prev) => [
        ...prev,
        { teamId, previousValue: entries[teamId] ?? null },
      ]);
      setEntries((prev) => ({ ...prev, [teamId]: numValue }));
    },
    [entries],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setEntries((current) => ({
        ...current,
        [last.teamId]: last.previousValue,
      }));
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    const cleared: Record<string, number | null> = {};
    for (const team of teams) {
      cleared[team.id] = null;
    }
    setEntries(cleared);
    setUndoStack([]);
  }, [teams]);

  const handleSubmit = useCallback(() => {
    const scores: Record<string, number> = {};
    for (const [teamId, value] of Object.entries(entries)) {
      scores[teamId] = value ?? 0;
    }
    onSubmitScores(scores);
  }, [entries, onSubmitScores]);

  // Ctrl+Z global handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.code === 'KeyZ' &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="font-bold text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
          }}
        >
          Round {roundNumber} Scoring
        </h3>
        <span
          className="text-foreground-secondary tabular-nums"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
          aria-live="polite"
          aria-label={`${enteredCount} of ${teams.length} teams entered`}
        >
          {enteredCount}/{teams.length} entered
        </span>
      </div>

      {/* Instruction */}
      <p
        className="text-foreground-secondary"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)' }}
      >
        Enter the total score for each team this round:
      </p>

      {/* Team score entries */}
      <div className="flex flex-col gap-2" role="group" aria-label="Team round scores">
        {sortedTeams.map((team) => {
          const teamIndex = teams.indexOf(team);
          const teamColor = getTeamColor(teamIndex >= 0 ? teamIndex : 0);
          const value = entries[team.id];

          return (
            <div
              key={team.id}
              className="flex items-center gap-3 rounded-lg border-2 px-3 py-2 transition-colors"
              style={{
                borderColor:
                  value !== null
                    ? teamColor.border
                    : 'rgba(255, 255, 255, 0.12)',
                background:
                  value !== null
                    ? teamColor.subtle
                    : 'rgba(255, 255, 255, 0.03)',
                minHeight: '52px',
              }}
            >
              {/* Color dot */}
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: '12px',
                  height: '12px',
                  background: teamColor.bg,
                }}
                aria-hidden="true"
              />

              {/* Team name + total */}
              <div className="flex-1 min-w-0">
                <span
                  className="font-semibold text-foreground truncate block"
                  style={{
                    fontSize: 'clamp(0.8rem, 1.3vw, 1rem)',
                  }}
                >
                  {team.name}
                </span>
                <span
                  className="text-foreground-secondary tabular-nums"
                  style={{ fontSize: 'clamp(0.625rem, 1vw, 0.75rem)' }}
                >
                  Total: {team.score}
                </span>
              </div>

              {/* Score input */}
              <input
                ref={(el) => {
                  inputRefs.current[team.id] = el;
                }}
                type="number"
                min={0}
                value={value ?? ''}
                onChange={(e) => handleScoreChange(team.id, e.target.value)}
                onKeyDown={(e) => {
                  // Enter advances to next input or submits
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const currentIdx = sortedTeams.findIndex((t) => t.id === team.id);
                    const nextTeam = sortedTeams[currentIdx + 1];
                    if (nextTeam && inputRefs.current[nextTeam.id]) {
                      inputRefs.current[nextTeam.id]?.focus();
                    } else if (allEntered) {
                      handleSubmit();
                    }
                  }
                }}
                placeholder="0"
                className="w-16 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-center font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                  fontFamily: 'var(--font-display)',
                }}
                aria-label={`Score for ${team.name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {/* Undo */}
        {undoStack.length > 0 && (
          <button
            onClick={handleUndo}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 px-3 text-foreground-secondary hover:text-foreground hover:border-foreground-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
              minHeight: '44px',
            }}
            aria-label="Undo last score entry (Ctrl+Z)"
          >
            <span aria-hidden="true">&#8617;</span>
            <span>Undo</span>
          </button>
        )}

        {/* Clear */}
        {enteredCount > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 px-3 text-foreground-secondary hover:text-foreground hover:border-foreground-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
              minHeight: '44px',
            }}
            aria-label="Clear all entries"
          >
            Clear
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Done */}
        <button
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{
            minHeight: '44px',
            fontSize: 'clamp(0.875rem, 1.3vw, 1rem)',
            background: allEntered
              ? 'var(--primary)'
              : 'var(--surface-elevated)',
            color: allEntered
              ? 'var(--primary-foreground)'
              : 'var(--foreground)',
            borderWidth: allEntered ? '0' : '1px',
            borderColor: 'var(--border)',
            borderStyle: 'solid',
          }}
          aria-label={
            allEntered
              ? 'Submit scores and advance'
              : `Submit scores (${enteredCount} of ${teams.length} entered)`
          }
        >
          Done
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Team } from '@/types';

interface TeamScoreInputProps {
  teams: Team[];
  currentRound: number;
  onAdjustScore: (teamId: string, delta: number) => void;
  onSetScore: (teamId: string, score: number) => void;
}

export function TeamScoreInput({
  teams,
  currentRound,
  onAdjustScore,
  onSetScore,
}: TeamScoreInputProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (team: Team) => {
    setEditingId(team.id);
    setEditValue(String(team.score));
  };

  const handleSaveEdit = () => {
    if (editingId) {
      const newScore = parseInt(editValue, 10);
      if (!isNaN(newScore)) {
        onSetScore(editingId, newScore);
      }
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  if (teams.length === 0) {
    return (
      <div className="text-center py-6" role="status">
        <p className="text-base text-muted-foreground">
          No teams yet. Add teams to start scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="Team score management">
      <div className="flex items-center justify-between">
        <h2 id="team-scores-heading" className="text-xl font-semibold">Team Scores</h2>
        <span className="text-base text-muted-foreground" aria-label={`Current round: ${currentRound + 1}`}>
          Round {currentRound + 1}
        </span>
      </div>

      <div className="space-y-2" role="list" aria-labelledby="team-scores-heading">
        {teams.map((team) => {
          const currentRoundScore = team.roundScores?.[currentRound] ?? 0;

          return (
            <div
              key={team.id}
              role="listitem"
              aria-label={`${team.name}: ${team.score} points`}
              className="flex flex-col gap-2 p-3 bg-background border border-border rounded-lg"
            >
              {/* Team header row */}
              <div className="flex items-center gap-3">
                {/* Team name */}
                <span className="flex-1 text-base font-medium text-foreground truncate">
                  {team.name}
                </span>

                {/* Score controls */}
                <div className="flex items-center gap-2" role="group" aria-label={`Score controls for ${team.name}`}>
                  {/* Minus button */}
                  <button
                    onClick={() => onAdjustScore(team.id, -1)}
                    aria-label={`Subtract 1 point from ${team.name}`}
                    title="Subtract 1 point"
                    className="min-w-[var(--size-touch)] min-h-[var(--size-touch)] rounded-lg bg-error/10 text-error
                      hover:bg-error/20 flex items-center justify-center
                      text-xl font-bold transition-colors"
                  >
                    <span aria-hidden="true">-</span>
                  </button>

                  {/* Score display (editable) */}
                  {editingId === team.id ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      aria-label={`Edit score for ${team.name}`}
                      className="w-16 min-h-[var(--size-touch)] text-center text-xl font-bold
                        border border-border rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <button
                      onClick={() => handleStartEdit(team)}
                      aria-label={`${team.name} score: ${team.score}. Click to edit`}
                      title="Click to edit total score"
                      className="w-16 min-h-[var(--size-touch)] text-center text-xl font-bold
                        bg-muted rounded-lg hover:bg-muted/80
                        transition-colors"
                    >
                      {team.score}
                    </button>
                  )}

                  {/* Plus button */}
                  <button
                    onClick={() => onAdjustScore(team.id, 1)}
                    aria-label={`Add 1 point to ${team.name}`}
                    title="Add 1 point"
                    className="min-w-[var(--size-touch)] min-h-[var(--size-touch)] rounded-lg bg-success/10 text-success
                      hover:bg-success/20 flex items-center justify-center
                      text-xl font-bold transition-colors"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </div>

              {/* Per-round breakdown */}
              {team.roundScores && team.roundScores.length > 0 && (
                <div className="flex items-center gap-2 text-base pl-1">
                  <span className="text-muted-foreground">Per round:</span>
                  {team.roundScores.map((roundScore, i) => (
                    <span
                      key={i}
                      className={`
                        px-2 py-0.5 rounded text-base font-medium
                        ${i === currentRound
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted/50 text-muted-foreground'
                        }
                      `}
                    >
                      R{i + 1}: {roundScore}
                    </span>
                  ))}
                  {currentRound > 0 && (
                    <span className="text-muted-foreground ml-auto">
                      This round: {currentRoundScore}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

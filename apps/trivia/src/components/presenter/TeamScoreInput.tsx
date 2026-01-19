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
      <div className="text-center py-6">
        <p className="text-base text-muted-foreground">
          No teams yet. Add teams to start scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Team Scores</h2>
        <span className="text-sm text-muted-foreground">
          Round {currentRound + 1}
        </span>
      </div>

      <div className="space-y-2">
        {teams.map((team) => {
          const currentRoundScore = team.roundScores?.[currentRound] ?? 0;

          return (
            <div
              key={team.id}
              className="flex flex-col gap-2 p-3 bg-background border border-border rounded-lg"
            >
              {/* Team header row */}
              <div className="flex items-center gap-3">
                {/* Team name */}
                <span className="flex-1 text-base font-medium text-foreground truncate">
                  {team.name}
                </span>

                {/* Score controls */}
                <div className="flex items-center gap-2">
                  {/* Minus button */}
                  <button
                    onClick={() => onAdjustScore(team.id, -1)}
                    className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600
                      hover:bg-red-500/20 flex items-center justify-center
                      text-xl font-bold transition-colors"
                    title="Subtract 1 point"
                  >
                    -
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
                      className="w-16 h-10 text-center text-xl font-bold
                        border border-border rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      onClick={() => handleStartEdit(team)}
                      className="w-16 h-10 text-center text-xl font-bold
                        bg-muted rounded-lg hover:bg-muted/80
                        transition-colors"
                      title="Click to edit total score"
                    >
                      {team.score}
                    </button>
                  )}

                  {/* Plus button */}
                  <button
                    onClick={() => onAdjustScore(team.id, 1)}
                    className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600
                      hover:bg-green-500/20 flex items-center justify-center
                      text-xl font-bold transition-colors"
                    title="Add 1 point"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Per-round breakdown */}
              {team.roundScores && team.roundScores.length > 0 && (
                <div className="flex items-center gap-2 text-sm pl-1">
                  <span className="text-muted-foreground">Per round:</span>
                  {team.roundScores.map((roundScore, i) => (
                    <span
                      key={i}
                      className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${i === currentRound
                          ? 'bg-blue-500/20 text-blue-600'
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

'use client';

import { useState } from 'react';
import type { Team, GameStatus } from '@/types';
import { MAX_TEAMS } from '@/types';

interface TeamManagerProps {
  teams: Team[];
  status: GameStatus;
  onAddTeam: (name?: string) => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
}

export function TeamManager({
  teams,
  status,
  onAddTeam,
  onRemoveTeam,
  onRenameTeam,
}: TeamManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const canAddMore = teams.length < MAX_TEAMS;

  const handleStartEdit = (team: Team) => {
    setEditingId(team.id);
    setEditValue(team.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameTeam(editingId, editValue.trim());
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

  return (
    <div className="space-y-4" role="region" aria-label="Team management">
      <div className="flex items-center justify-between">
        <h2 id="team-manager-heading" className="text-xl font-semibold">Teams</h2>
        {status === 'setup' && (
          <span className="text-sm text-muted-foreground">
            {teams.length}/{MAX_TEAMS}
          </span>
        )}
      </div>

      {/* Team list */}
      {teams.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto" role="list" aria-labelledby="team-manager-heading">
          {teams.map((team) => (
            <div
              key={team.id}
              role="listitem"
              aria-label={`Team: ${team.name}`}
              className="flex items-center gap-2 p-2 bg-background border border-border rounded-lg"
            >
              {editingId === team.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  aria-label="Edit team name"
                  className="flex-1 px-3 py-2 text-base border border-border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <>
                  <span className="flex-1 text-base font-medium text-foreground">
                    {team.name}
                  </span>
                  <button
                    onClick={() => handleStartEdit(team)}
                    aria-label={`Rename team ${team.name}`}
                    className="px-3 min-h-[var(--size-touch)] text-sm text-muted-foreground
                      hover:text-foreground hover:bg-muted rounded-lg
                      transition-colors"
                    title="Rename team"
                  >
                    Rename
                  </button>
                  {status === 'setup' && (
                    <button
                      onClick={() => onRemoveTeam(team.id)}
                      aria-label={`Remove team ${team.name}`}
                      className="px-3 min-h-[var(--size-touch)] text-sm text-red-500
                        hover:text-red-600 hover:bg-red-500/10 rounded-lg
                        transition-colors"
                      title="Remove team"
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No teams added yet
        </p>
      )}

      {/* Add team button - only in setup */}
      {status === 'setup' && (
        <button
          onClick={() => onAddTeam()}
          disabled={!canAddMore}
          className={`
            w-full px-4 py-3 rounded-xl text-base font-medium
            transition-colors duration-200
            ${
              canAddMore
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {canAddMore
            ? 'Add Team'
            : `Maximum Teams Reached (${MAX_TEAMS})`}
        </button>
      )}

      {status === 'setup' && teams.length === 0 && (
        <p className="text-sm text-amber-600 text-center">
          Add at least one team to start the game
        </p>
      )}
    </div>
  );
}

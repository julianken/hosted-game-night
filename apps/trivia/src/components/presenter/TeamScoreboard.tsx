'use client';

import type { Team } from '@/types';

interface TeamScoreboardProps {
  teams: Team[];
}

export function TeamScoreboard({ teams }: TeamScoreboardProps) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-8" role="status">
        <p className="text-muted-foreground">No teams yet</p>
      </div>
    );
  }

  // Sort teams by score descending
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  // Calculate ranks (handling ties)
  const rankedTeams = sortedTeams.map((team, index) => {
    let rank = index + 1;
    // Check for ties with previous team
    if (index > 0 && sortedTeams[index - 1].score === team.score) {
      // Find the first team with this score
      for (let i = index - 1; i >= 0; i--) {
        if (sortedTeams[i].score === team.score) {
          rank = i + 1;
        } else {
          break;
        }
      }
    }
    return { ...team, rank };
  });

  return (
    <div className="space-y-4" role="region" aria-label="Team scoreboard">
      <h2 id="scoreboard-heading" className="text-xl font-semibold">Scoreboard</h2>

      <div
        className="space-y-2"
        role="list"
        aria-labelledby="scoreboard-heading"
        aria-live="polite"
      >
        {rankedTeams.map((team) => (
          <div
            key={team.id}
            role="listitem"
            aria-label={`Rank ${team.rank}: ${team.name} with ${team.score} points`}
            className={`
              flex items-center justify-between p-3 rounded-lg
              ${
                team.score > 0 && team.rank === 1
                  ? 'bg-yellow-500/20 border-2 border-yellow-500'
                  : team.score > 0 && team.rank === 2
                  ? 'bg-gray-500/20 border border-gray-400'
                  : team.score > 0 && team.rank === 3
                  ? 'bg-orange-500/20 border border-orange-400'
                  : 'bg-background border border-border'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {/* Rank badge */}
              <span
                aria-hidden="true"
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-base font-bold
                  ${
                    team.score > 0 && team.rank === 1
                      ? 'bg-yellow-500 text-yellow-950'
                      : team.score > 0 && team.rank === 2
                      ? 'bg-gray-400 text-white'
                      : team.score > 0 && team.rank === 3
                      ? 'bg-orange-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {team.rank}
              </span>

              {/* Team name */}
              <span className="text-base font-medium text-foreground">
                {team.name}
              </span>
            </div>

            {/* Score */}
            <span className="text-xl font-bold text-foreground" aria-label={`${team.score} points`}>
              {team.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

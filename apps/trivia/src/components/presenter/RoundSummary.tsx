'use client';

import type { Team } from '@/types';

interface RoundSummaryProps {
  currentRound: number;
  totalRounds: number;
  roundWinners: Team[];
  teamsSortedByScore: Team[];
  isLastRound: boolean;
  onNextRound: () => void;
  onClose: () => void;
}

export function RoundSummary({
  currentRound,
  totalRounds,
  roundWinners,
  teamsSortedByScore,
  isLastRound,
  onNextRound,
  onClose,
}: RoundSummaryProps) {
  const roundNumber = currentRound + 1;

  return (
    <section
      className="bg-background border border-border rounded-xl p-4 shadow-sm space-y-4"
      role="region"
      aria-label={isLastRound ? 'Final results' : `Round ${roundNumber} summary`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isLastRound ? 'Final Results' : `Round ${roundNumber} Complete`}
          </h2>
          {!isLastRound && (
            <p className="text-base text-muted-foreground">
              {totalRounds - roundNumber} round{totalRounds - roundNumber !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
        {/* Round Winner Badge */}
        {roundWinners.length > 0 && (
          <div className="text-right" role="status" aria-live="polite">
            <span className="text-base text-muted-foreground uppercase tracking-wide">
              {isLastRound ? 'Winner' : 'Round Winner'}
            </span>
            <div className="text-lg font-bold text-success" aria-label={`${isLastRound ? 'Winner' : 'Round winner'}: ${roundWinners.map(t => t.name).join(', ')}`}>
              {roundWinners.map(t => t.name).join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Compact Standings */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Current standings">
        {teamsSortedByScore.slice(0, 5).map((team, index) => (
          <div
            key={team.id}
            role="listitem"
            aria-label={`${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} place: ${team.name} with ${team.score} points`}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-base
              ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted/50'}
            `}
          >
            <span className="font-medium" aria-hidden="true">{index + 1}.</span>
            <span>{team.name}</span>
            <span className="font-bold">{team.score}</span>
          </div>
        ))}
        {teamsSortedByScore.length > 5 && (
          <span className="text-base text-muted-foreground self-center" aria-label={`And ${teamsSortedByScore.length - 5} more teams`}>
            +{teamsSortedByScore.length - 5} more
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3" role="group" aria-label="Round actions">
        <button
          onClick={onClose}
          aria-label={isLastRound ? 'View questions' : 'Return to game'}
          className="px-4 py-2 rounded-lg text-base font-medium
            bg-muted text-foreground hover:bg-muted/80
            transition-colors duration-200"
        >
          {isLastRound ? 'View Questions' : 'Back to Game'}
        </button>
        <button
          onClick={onNextRound}
          aria-label={isLastRound ? 'End game and show final results' : `Start round ${roundNumber + 1}`}
          className="px-4 py-2 rounded-lg text-base font-semibold
            bg-success hover:bg-success/90 text-white
            transition-colors duration-200"
        >
          {isLastRound ? 'End Game' : 'Next Round'}
        </button>
      </div>
    </section>
  );
}

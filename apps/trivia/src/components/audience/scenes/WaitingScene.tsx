'use client';

import { useGameStore } from '@/stores/game-store';
import { WaitingDisplay } from '@/components/audience/WaitingDisplay';

export interface WaitingSceneProps {
  message?: string;
}

/**
 * WaitingScene (T1.9)
 *
 * Wraps the existing WaitingDisplay component for use in SceneRouter.
 * Renders the cinematic "Trivia" wordmark with a configurable status message.
 *
 * Reads teams from the game store and renders a team roster grid below
 * WaitingDisplay so the audience can see who has connected before the game starts.
 */
export function WaitingScene({ message = 'Waiting for presenter...' }: WaitingSceneProps) {
  // Targeted selector — only re-renders when teams array changes.
  const teams = useGameStore((state) => state.teams);

  return (
    <div className="flex flex-col h-full">
      {/* Cinematic waiting display with room code */}
      <div className={teams.length > 0 ? 'flex-1' : 'h-full'}>
        <WaitingDisplay message={message} />
      </div>

      {/* Team roster grid — only shown when teams are connected (BEA-607) */}
      {teams.length > 0 && (
        <div
          className="flex-shrink-0 px-8 pb-10 pt-6"
          role="region"
          aria-label="Connected teams"
        >
          {/* Section heading */}
          <p
            className="text-center font-medium uppercase tracking-widest text-foreground-secondary mb-6"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', letterSpacing: '0.12em' }}
          >
            Connected Teams
          </p>

          {/* Responsive grid — up to 6 columns on wide displays */}
          <ul
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(140px, 14vw, 220px), 1fr))',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
            aria-label={`${teams.length} team${teams.length === 1 ? '' : 's'} connected`}
          >
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-center rounded-2xl border border-border bg-surface/60 text-foreground font-semibold text-center"
                style={{
                  minHeight: 'clamp(56px, 7vh, 80px)',
                  padding: 'clamp(12px, 1.5vh, 20px) clamp(16px, 2vw, 28px)',
                  fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span className="truncate">{team.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

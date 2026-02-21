'use client';

import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import type { Team } from '@/types';
import { winnerCard, podiumCard, scoreboardRowStagger, scoreboardRow, springSceneTransition } from '@/lib/motion/presets';
import { getTeamColor } from '@/lib/motion/team-colors';
import { AnimatedScore } from './AnimatedScore';

export interface GameEndDisplayProps {
  teams: Team[];
}

/**
 * Final results display in podium arrangement: 2nd | 1st | 3rd.
 *
 * Winner card: team-colored glow, WINNER text label (NO trophy emoji — rule 1).
 * 2nd and 3rd: flanking cards with smaller presence.
 * Other teams: ranked list below the podium.
 *
 * Scores use AnimatedScore rolling counter.
 * Respects prefers-reduced-motion.
 *
 * Team colors used only as border/glow accents.
 * Names and scores displayed in --foreground (Issue A-08: team colors at 20px+ bold only).
 */
export function GameEndDisplay({ teams }: GameEndDisplayProps) {
  const shouldReduceMotion = useReducedMotion();

  const winner = teams[0];
  const second = teams[1];
  const third = teams[2];
  const otherTeams = teams.slice(3);

  const winnerColor = winner ? getTeamColor(0) : null;
  const secondColor = second ? getTeamColor(1) : null;
  const thirdColor = third ? getTeamColor(2) : null;

  return (
    <section
      className="flex flex-col items-center h-full w-full"
      style={{ gap: 'clamp(16px, 2.5vh, 36px)', padding: '2vh 3vw' }}
      role="region"
      aria-label="Final game results"
    >
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        {winner ? `Game over. Winner: ${winner.name} with ${winner.score} points.` : 'Game over. No teams.'}
      </div>

      {/* Header */}
      <div className="text-center flex-shrink-0">
        <h1
          className="font-bold text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            letterSpacing: '-0.03em',
          }}
        >
          Game Over
        </h1>
      </div>

      {/* Podium: 2nd | 1st | 3rd */}
      <div
        className="flex items-end justify-center w-full"
        style={{ gap: 'clamp(12px, 1.5vw, 28px)', maxWidth: '90vw', flex: '1', minHeight: 0 }}
      >

        {/* 2nd place — left flanking */}
        {second && secondColor && (
          <motion.div
            variants={podiumCard}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            transition={shouldReduceMotion ? { duration: 0 } : { ...springSceneTransition, delay: 0.3 }}
            role="article"
            aria-label={`2nd place: ${second.name} with ${second.score} points`}
            className="flex-1 flex flex-col items-center text-center overflow-hidden"
            style={{
              background: secondColor.subtle,
              border: `clamp(2px, 0.2vw, 4px) solid ${secondColor.border}`,
              padding: 'clamp(20px, 3vh, 40px) clamp(12px, 1.5vw, 28px)',
              alignSelf: 'flex-end',
              minHeight: 'clamp(160px, 22vh, 280px)',
              maxWidth: '30vw',
              borderRadius: 'clamp(16px, 1.5vw, 28px)',
            }}
          >
            <span
              className="font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                color: secondColor.bg,
                marginBottom: 'clamp(4px, 0.5vh, 12px)',
              }}
              aria-hidden="true"
            >
              2ND
            </span>
            <h3
              className="font-bold text-foreground"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.75rem)',
                marginBottom: 'clamp(4px, 0.5vh, 12px)',
              }}
            >
              {second.name}
            </h3>
            <AnimatedScore
              value={second.score}
              className="font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                color: secondColor.bg,
              }}
            />
            <span className="sr-only">points</span>
          </motion.div>
        )}

        {/* 1st place — center hero */}
        {winner && winnerColor && (
          <motion.div
            variants={winnerCard}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            transition={shouldReduceMotion ? { duration: 0 } : { ...springSceneTransition, delay: 0.1 }}
            role="article"
            aria-label={`Winner: ${winner.name} with ${winner.score} points`}
            className="flex-1 flex flex-col items-center text-center overflow-hidden"
            style={{
              background: winnerColor.subtle,
              border: `clamp(3px, 0.3vw, 5px) solid ${winnerColor.border}`,
              boxShadow: shouldReduceMotion ? 'none' : `0 0 60px 20px ${winnerColor.glow}`,
              padding: 'clamp(28px, 4vh, 56px) clamp(16px, 2vw, 36px)',
              minHeight: 'clamp(220px, 32vh, 400px)',
              maxWidth: '36vw',
              borderRadius: 'clamp(16px, 1.5vw, 28px)',
            }}
          >
            {/* WINNER label — NO emoji */}
            <span
              className="font-bold tracking-widest uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                color: winnerColor.bg,
                letterSpacing: '0.12em',
                marginBottom: 'clamp(4px, 0.5vh, 12px)',
              }}
              aria-hidden="true"
            >
              WINNER
            </span>

            {/* Crown icon (SVG, not emoji) */}
            <svg
              style={{
                width: 'clamp(48px, 6vh, 80px)',
                height: 'clamp(48px, 6vh, 80px)',
                color: winnerColor.bg,
                marginBottom: 'clamp(8px, 1vh, 20px)',
              }}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2L9 9H2l5.5 4-2 7 6.5-4.5L18 20l-2-7L21.5 9H15L12 2z" />
            </svg>

            <h2
              className="font-bold text-foreground"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 4.5vw, 4rem)',
                letterSpacing: '-0.02em',
                marginBottom: 'clamp(8px, 1vh, 20px)',
              }}
            >
              {winner.name}
            </h2>
            <AnimatedScore
              value={winner.score}
              className="font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                color: winnerColor.bg,
              }}
            />
            <span className="sr-only">points</span>
            <p
              className="text-foreground-secondary"
              style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', marginTop: 'clamp(2px, 0.3vh, 8px)' }}
              aria-hidden="true"
            >
              points
            </p>
          </motion.div>
        )}

        {/* 3rd place — right flanking */}
        {third && thirdColor && (
          <motion.div
            variants={podiumCard}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            transition={shouldReduceMotion ? { duration: 0 } : { ...springSceneTransition, delay: 0.5 }}
            role="article"
            aria-label={`3rd place: ${third.name} with ${third.score} points`}
            className="flex-1 flex flex-col items-center text-center overflow-hidden"
            style={{
              background: thirdColor.subtle,
              border: `clamp(2px, 0.2vw, 4px) solid ${thirdColor.border}`,
              padding: 'clamp(20px, 3vh, 40px) clamp(12px, 1.5vw, 28px)',
              alignSelf: 'flex-end',
              minHeight: 'clamp(140px, 18vh, 240px)',
              maxWidth: '28vw',
              borderRadius: 'clamp(16px, 1.5vw, 28px)',
            }}
          >
            <span
              className="font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                color: thirdColor.bg,
                marginBottom: 'clamp(4px, 0.5vh, 12px)',
              }}
              aria-hidden="true"
            >
              3RD
            </span>
            <h3
              className="font-bold text-foreground"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                marginBottom: 'clamp(4px, 0.5vh, 12px)',
              }}
            >
              {third.name}
            </h3>
            <AnimatedScore
              value={third.score}
              className="font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
                color: thirdColor.bg,
              }}
            />
            <span className="sr-only">points</span>
          </motion.div>
        )}
      </div>

      {/* Other teams */}
      {otherTeams.length > 0 && (
        <div className="w-full flex-shrink-0" style={{ maxWidth: '80vw', padding: '0 2vw' }}>
          <h3
            id="other-participants-heading"
            className="font-semibold text-foreground-secondary text-center"
            style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', marginBottom: 'clamp(8px, 1vh, 20px)' }}
          >
            Other Participants
          </h3>
          <motion.ul
            role="list"
            aria-labelledby="other-participants-heading"
            variants={scoreboardRowStagger}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8vh, 16px)' }}
          >
            <AnimatePresence>
              {otherTeams.map((team, index) => {
                const teamColor = getTeamColor(index + 3);
                return (
                  <motion.li
                    key={team.id}
                    variants={scoreboardRow}
                    transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.07 }}
                    className="flex items-center justify-between overflow-hidden"
                    style={{
                      background: 'rgba(26, 23, 32, 0.6)',
                      borderLeft: `clamp(4px, 0.4vw, 6px) solid ${teamColor.bg}`,
                      padding: 'clamp(10px, 1.5vh, 24px) clamp(16px, 2vw, 32px)',
                      borderRadius: 'clamp(12px, 1.2vw, 20px)',
                    }}
                    aria-label={`${index + 4}th place: ${team.name} with ${team.score} points`}
                  >
                    <div className="flex items-center" style={{ gap: 'clamp(8px, 1vw, 20px)' }}>
                      <span
                        className="font-semibold text-foreground-secondary"
                        style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', minWidth: 'clamp(28px, 3vw, 48px)' }}
                        aria-hidden="true"
                      >
                        {index + 4}.
                      </span>
                      <span
                        className="font-medium text-foreground"
                        style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)' }}
                      >
                        {team.name}
                      </span>
                    </div>
                    <AnimatedScore
                      value={team.score}
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)',
                        color: teamColor.bg,
                      }}
                    />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        </div>
      )}

      {/* No teams */}
      {teams.length === 0 && (
        <div className="text-center" role="status" style={{ padding: '4vh 0' }}>
          <p
            className="text-foreground-secondary"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
          >
            No teams participated
          </p>
        </div>
      )}

      {/* Thank you — no emojis */}
      <div className="text-center flex-shrink-0">
        <p
          className="text-foreground-secondary"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
        >
          Thanks for playing!
        </p>
      </div>
    </section>
  );
}

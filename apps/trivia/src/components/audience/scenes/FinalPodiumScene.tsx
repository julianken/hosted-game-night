'use client';

import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameStore, useGameSelectors } from '@/stores/game-store';
import { getTeamColor } from '@/lib/motion/team-colors';
import {
  podium1st,
  podium2nd,
  podium3rd,
  podium1stReduced,
  podium2ndReduced,
  podium3rdReduced,
  podiumRest,
  podiumRestReduced,
  winnerAnnouncement,
} from '@/lib/motion/presets';

/**
 * Staged reveal timings for FinalPodiumScene.
 */
const PODIUM_TIMINGS = {
  TITLE_APPEAR:   0,
  TEASE_APPEAR:   500,
  TEASE_FADE:     1700,
  THIRD_SLIDE:    2000,
  SECOND_SLIDE:   3000,
  DRAMATIC_PAUSE: 4000,
  FIRST_SLIDE:    4800,
  CONFETTI_START: 6500,
  OTHERS_APPEAR:  7000,
} as const;

/**
 * Generate deterministic confetti particle config from index.
 * Uses index-based arithmetic — NO Math.random().
 */
function getConfettiConfig(index: number) {
  // Spread particles across the full width (0-100%)
  const left = (index * 3.45 + 5) % 100;
  // Fall duration 2.5s to 4s
  const fallDuration = 2.5 + (index % 6) * 0.25;
  // Stagger delay
  const fallDelay = (index * 0.12) % 1.5;
  // Hue rotation across full spectrum
  const hue = (index * 37) % 360;
  // Drift: slight horizontal wobble
  const drift = ((index % 5) - 2) * 15;

  return { left, fallDuration, fallDelay, hue, drift };
}

/**
 * FinalPodiumScene (T3.4)
 *
 * Staged 8-second podium reveal: 3rd place -> 2nd place -> dramatic pause -> 1st place.
 * Then confetti bursts and remaining teams appear.
 *
 * Uses Motion variants from lib/motion/presets.ts for podium cards.
 * Confetti: 30 divs with deterministic CSS variables (no Math.random).
 * Reduced motion: all cards appear instantly, no confetti.
 */
export function FinalPodiumScene() {
  const shouldReduceMotion = useReducedMotion();

  // Read sorted teams via selectors
  const teams = useGameStore((state) => state.teams);
  const selectors = useGameSelectors();
  const sortedTeams = selectors.teamsSortedByScore;

  // Podium positions (top 3)
  const first = sortedTeams[0] ?? null;
  const second = sortedTeams[1] ?? null;
  const third = sortedTeams[2] ?? null;
  const rest = sortedTeams.slice(3);

  // Find original team index for color lookup
  const getTeamIndex = (teamId: string) => teams.findIndex((t) => t.id === teamId);

  // Phase tracking via timeouts
  const [showTitle, setShowTitle] = useState(shouldReduceMotion ?? false);
  const [showTease, setShowTease] = useState(false);
  const [teaseVisible, setTeaseVisible] = useState(false);
  const [showThird, setShowThird] = useState(shouldReduceMotion ?? false);
  const [showSecond, setShowSecond] = useState(shouldReduceMotion ?? false);
  const [showFirst, setShowFirst] = useState(shouldReduceMotion ?? false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showOthers, setShowOthers] = useState(shouldReduceMotion ?? false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (shouldReduceMotion) {
      // Reduced motion: show everything instantly
      setShowTitle(true);
      setShowThird(true);
      setShowSecond(true);
      setShowFirst(true);
      setShowOthers(true);
      return;
    }

    const schedule = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    // Title appears immediately
    schedule(PODIUM_TIMINGS.TITLE_APPEAR, () => setShowTitle(true));

    // "AND THE WINNER IS..." tease
    schedule(PODIUM_TIMINGS.TEASE_APPEAR, () => {
      setShowTease(true);
      setTeaseVisible(true);
    });

    // Tease fades
    schedule(PODIUM_TIMINGS.TEASE_FADE, () => setTeaseVisible(false));

    // 3rd place card slides up
    schedule(PODIUM_TIMINGS.THIRD_SLIDE, () => setShowThird(true));

    // 2nd place card slides up
    schedule(PODIUM_TIMINGS.SECOND_SLIDE, () => setShowSecond(true));

    // 1st place card slides up (at 4.8s — matches podium1st variant delay)
    schedule(PODIUM_TIMINGS.FIRST_SLIDE, () => setShowFirst(true));

    // Confetti burst
    schedule(PODIUM_TIMINGS.CONFETTI_START, () => setShowConfetti(true));

    // Remaining teams appear
    schedule(PODIUM_TIMINGS.OTHERS_APPEAR, () => setShowOthers(true));

    // Self-cleanup confetti at 11.5s
    schedule(11500, () => setShowConfetti(false));

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount once — intentional empty deps (shouldReduceMotion read once at mount)

  const firstTeamIndex = first ? getTeamIndex(first.id) : 0;
  const firstColor = getTeamColor(firstTeamIndex);

  return (
    <section
      className="relative flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 w-full px-4 overflow-hidden"
      role="region"
      aria-label="Final standings podium"
      aria-live="polite"
    >
      {/* Confetti particles — 30 divs, CSS animation via custom properties */}
      {showConfetti && !shouldReduceMotion && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: 30 }, (_, i) => {
            const cfg = getConfettiConfig(i);
            return (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${cfg.left}%`,
                  '--fall-duration': `${cfg.fallDuration}s`,
                  '--fall-delay': `${cfg.fallDelay}s`,
                  '--fall-rotation': `${360 + cfg.drift}deg`,
                  '--hue': `${cfg.hue}`,
                  background: `hsl(${cfg.hue}, 80%, 60%)`,
                  borderRadius: i % 3 === 0 ? '50%' : '2px',
                  width: 8 + (i % 4) * 3 + 'px',
                  height: 8 + (i % 4) * 3 + 'px',
                  animationDelay: `${cfg.fallDelay}s`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      )}

      {/* Title */}
      <AnimatePresence>
        {showTitle && (
          <motion.h2
            className="display-gradient-text font-black uppercase tracking-widest text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 3rem)',
              letterSpacing: '0.15em',
            }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            FINAL STANDINGS
          </motion.h2>
        )}
      </AnimatePresence>

      {/* "AND THE WINNER IS..." tease */}
      <AnimatePresence>
        {showTease && (
          <motion.p
            className="absolute text-foreground-secondary font-semibold"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              letterSpacing: '0.08em',
              top: '30%',
            }}
            variants={winnerAnnouncement}
            initial="hidden"
            animate={teaseVisible ? 'visible' : 'exit'}
            exit="exit"
          >
            AND THE WINNER IS...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Podium layout */}
      <div
        className="flex items-end justify-center gap-4 w-full max-w-4xl"
        role="list"
        aria-label="Final standings"
      >
        {/* 2nd place */}
        <AnimatePresence>
          {showSecond && second && (
            <motion.div
              className="flex flex-col items-center gap-3"
              style={{ flex: '0 0 auto', width: '200px' }}
              variants={shouldReduceMotion ? podium2ndReduced : podium2nd}
              initial="hidden"
              animate="visible"
              role="listitem"
            >
              <PodiumCard
                team={second}
                rank={2}
                teamIndex={getTeamIndex(second.id)}
                isWinner={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1st place — center and taller */}
        <AnimatePresence>
          {showFirst && first && (
            <motion.div
              className="flex flex-col items-center gap-3"
              style={{ flex: '0 0 auto', width: '240px' }}
              variants={shouldReduceMotion ? podium1stReduced : podium1st}
              initial="hidden"
              animate="visible"
              role="listitem"
            >
              {/* Crown icon above winner (SVG, not emoji) */}
              <div className="flex justify-center">
                <svg
                  style={{ width: 'clamp(2rem, 4vw, 3.5rem)', height: 'clamp(2rem, 4vw, 3.5rem)', color: firstColor.bg }}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2L9 9H2l5.5 4-2 7 6.5-4.5L18 20l-2-7L21.5 9H15L12 2z" />
                </svg>
              </div>
              <PodiumCard
                team={first}
                rank={1}
                teamIndex={firstTeamIndex}
                isWinner={true}
                winnerGlow={firstColor.glow}
                winnerGlowRing={firstColor.border}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3rd place */}
        <AnimatePresence>
          {showThird && third && (
            <motion.div
              className="flex flex-col items-center gap-3"
              style={{ flex: '0 0 auto', width: '200px' }}
              variants={shouldReduceMotion ? podium3rdReduced : podium3rd}
              initial="hidden"
              animate="visible"
              role="listitem"
            >
              <PodiumCard
                team={third}
                rank={3}
                teamIndex={getTeamIndex(third.id)}
                isWinner={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Remaining teams (4th+) */}
      <AnimatePresence>
        {showOthers && rest.length > 0 && (
          <motion.div
            className="flex flex-wrap justify-center gap-3"
            variants={shouldReduceMotion ? podiumRestReduced : podiumRest}
            initial="hidden"
            animate="visible"
            role="list"
            aria-label="Additional standings"
          >
            {rest.map((team, index) => {
              const rank = index + 4;
              const teamIndex = getTeamIndex(team.id);
              const color = getTeamColor(teamIndex);
              return (
                <div
                  key={team.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                  style={{
                    borderColor: color.border,
                    background: color.subtle,
                  }}
                  role="listitem"
                >
                  <span
                    className="font-bold text-foreground-secondary"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
                  >
                    {rank}.
                  </span>
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
                      color: color.bg,
                    }}
                  >
                    {team.name}
                  </span>
                  <span
                    className="font-bold tabular-nums text-foreground-secondary"
                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
                  >
                    {team.score}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// =============================================================================
// PODIUM CARD SUBCOMPONENT
// =============================================================================

interface PodiumCardProps {
  team: { id: string; name: string; score: number };
  rank: 1 | 2 | 3;
  teamIndex: number;
  isWinner: boolean;
  winnerGlow?: string;
  winnerGlowRing?: string;
}

function PodiumCard({
  team,
  rank,
  teamIndex,
  isWinner,
  winnerGlow,
  winnerGlowRing,
}: PodiumCardProps) {
  const color = getTeamColor(teamIndex);

  const rankLabels = { 1: '1st', 2: '2nd', 3: '3rd' } as const;
  const rankSizes = { 1: 'clamp(1rem, 2vw, 1.5rem)', 2: 'clamp(0.875rem, 1.5vw, 1.25rem)', 3: 'clamp(0.875rem, 1.5vw, 1.25rem)' };
  const nameSizes = { 1: 'clamp(1.5rem, 3vw, 2.5rem)', 2: 'clamp(1.25rem, 2.5vw, 2rem)', 3: 'clamp(1.25rem, 2.5vw, 2rem)' };
  const scoreSizes = { 1: 'clamp(2.5rem, 5vw, 4rem)', 2: 'clamp(2rem, 4vw, 3rem)', 3: 'clamp(2rem, 4vw, 3rem)' };

  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-5 py-6 text-center${isWinner ? ' winner-pulse-glow' : ''}`}
      style={{
        borderColor: color.border,
        background: color.subtle,
        ...(isWinner && {
          '--winner-glow': winnerGlow ?? color.glow,
          '--winner-glow-ring': winnerGlowRing ?? color.border,
        } as React.CSSProperties),
      }}
      aria-label={`${rankLabels[rank]} place: ${team.name} with ${team.score} points`}
    >
      {/* Rank badge */}
      <span
        className="font-bold uppercase tracking-wider"
        style={{
          fontSize: rankSizes[rank],
          color: color.bg,
          letterSpacing: '0.1em',
          fontFamily: 'var(--font-display)',
        }}
      >
        {rankLabels[rank]}
      </span>

      {/* Team name */}
      <span
        className="font-bold leading-tight"
        style={{
          fontSize: nameSizes[rank],
          color: 'var(--foreground)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {team.name}
      </span>

      {/* Score */}
      <span
        className="font-black tabular-nums leading-none"
        style={{
          fontSize: scoreSizes[rank],
          color: color.bg,
          fontFamily: 'var(--font-display)',
        }}
        aria-label={`${team.score} points`}
      >
        {team.score}
      </span>
    </div>
  );
}

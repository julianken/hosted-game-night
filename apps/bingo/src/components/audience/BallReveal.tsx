'use client';

import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import { BingoBall, BingoColumn } from '@/types';

/**
 * Bingo-specific spring preset for ball reveal.
 * High-energy, bouncy — stiffness 120, damping 14.
 */
const springBallReveal = { type: 'spring' as const, stiffness: 120, damping: 14, mass: 1 };

export interface BallRevealProps {
  ball: BingoBall | null;
  /** Auto-call interval in seconds. Controls animation complexity. */
  autoCallInterval?: number;
  /** Whether auto-call is active. Manual calls always get full animation. */
  isAutoCall?: boolean;
  /** Size preset. 'hero' = full-screen, 'display' = audience top row, 'compact' = small strip. */
  size?: 'hero' | 'display' | 'compact';
}

/**
 * Determine animation tier based on auto-call speed.
 * Issue 2.4: Ball animation scaling.
 *   - Manual / interval >= 8s: Full (rotateY + scale + blur)
 *   - Interval 5-8s: Simplified (scale only, 300ms ease-out)
 *   - Interval < 5s: Instant (150ms opacity crossfade)
 */
function getAnimationTier(isAutoCall?: boolean, interval?: number): 'full' | 'simple' | 'instant' {
  if (!isAutoCall || interval === undefined) return 'full';
  if (interval >= 8) return 'full';
  if (interval >= 5) return 'simple';
  return 'instant';
}

function getBallBackground(column: BingoColumn): string {
  // Layer ordering (top to bottom in paint order):
  //   1. Sharp specular highlight — small bright spot top-left, mimics glossy lacquer
  //   2. Broad top-hemisphere fill — softens the surface light falloff
  //   3. Limb darkening — black radial from center-out, darkens edges uniformly (physically accurate)
  //   4. Bottom rim light — faint reflected fill from the surface the ball sits on
  //   5. Base color
  // Stronger specular for the outer sphere ring — reference shows bright top-left highlight
  const specular = 'radial-gradient(ellipse 45% 35% at 35% 25%, rgba(255,255,255,0.57) 0%, rgba(255,255,255,0.0) 100%)';
  const topFill = 'radial-gradient(ellipse 85% 65% at 40% 28%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 70%)';
  const limbDarken = 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.0) 38%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.35) 100%)';
  const rimLight = 'radial-gradient(ellipse 60% 30% at 50% 92%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 100%)';

  const map: Record<BingoColumn, string> = {
    B: `${specular}, ${topFill}, ${limbDarken}, ${rimLight}, #3B82F6`,
    I: `${specular}, ${topFill}, ${limbDarken}, ${rimLight}, #EF4444`,
    N: [
      'radial-gradient(ellipse 38% 28% at 35% 28%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.0) 100%)',
      'radial-gradient(ellipse 80% 60% at 38% 32%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.0) 70%)',
      'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.0) 42%, rgba(0,0,0,0.05) 68%, rgba(0,0,0,0.18) 100%)',
      `${rimLight}`,
      '#E8E6EB',
    ].join(', '),
    G: `${specular}, ${topFill}, ${limbDarken}, ${rimLight}, #22C55E`,
    O: `${specular}, ${topFill}, ${limbDarken}, ${rimLight}, #F59E0B`,
  };
  return map[column];
}

function getBallBoxShadow(column: BingoColumn): string {
  // Two-layer glow: tight inner glow + large soft halo (matches reference)
  const glows: Record<BingoColumn, string> = {
    B: '0 4px 30px rgba(59, 130, 246, 0.60), 0 0px 80px rgba(59, 130, 246, 0.35)',
    I: '0 4px 30px rgba(239, 68, 68, 0.60), 0 0px 80px rgba(239, 68, 68, 0.35)',
    N: '0 4px 30px rgba(200, 196, 210, 0.40), 0 0px 60px rgba(200, 196, 210, 0.20)',
    G: '0 4px 30px rgba(34, 197, 94, 0.60), 0 0px 80px rgba(34, 197, 94, 0.35)',
    O: '0 4px 30px rgba(245, 158, 11, 0.60), 0 0px 80px rgba(245, 158, 11, 0.35)',
  };
  return [
    // Inset bottom shadow — sphere curvature
    'inset 0 -8px 18px rgba(0,0,0,0.35)',
    // Inset top highlight — lacquer depth
    'inset 0 4px 10px rgba(255,255,255,0.15)',
    // Drop shadow for grounding
    '0 8px 20px rgba(0,0,0,0.40)',
    glows[column],
  ].join(', ');
}

function getBallTextColor(_column: BingoColumn): string {
  // All text is dark — sits on the white inner face
  return '#1A1720';
}

/**
 * BallReveal — Motion-powered spring ball entrance for audience display.
 *
 * Uses AnimatePresence for exit animations and useReducedMotion for
 * accessibility compliance (Issue A-20).
 *
 * Role is "status" with aria-live="assertive" per Issue A-17.
 */
export function BallReveal({ ball, autoCallInterval, isAutoCall, size = 'hero' }: BallRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const tier = getAnimationTier(isAutoCall, autoCallInterval);

  // Determine animation based on tier and reduced motion preference
  const getInitial = () => {
    if (prefersReducedMotion) return { opacity: 0 };
    if (tier === 'full') return { scale: 0, rotateY: 180, filter: 'blur(8px)', opacity: 0 };
    if (tier === 'simple') return { scale: 0.6, opacity: 0 };
    return { opacity: 0 };
  };

  const getAnimate = () => {
    if (prefersReducedMotion) return { opacity: 1 };
    if (tier === 'full') return { scale: 1, rotateY: 0, filter: 'blur(0px)', opacity: 1 };
    if (tier === 'simple') return { scale: 1, opacity: 1 };
    return { opacity: 1 };
  };

  const getExit = () => {
    if (prefersReducedMotion) return { opacity: 0 };
    if (tier === 'instant') return { opacity: 0 };
    return { scale: 0.8, opacity: 0 };
  };

  const getTransition = (): Transition => {
    if (prefersReducedMotion) return { duration: 0 };
    if (tier === 'full') return springBallReveal;
    if (tier === 'simple') return { duration: 0.3, ease: [0, 0, 0.58, 1] };
    return { duration: 0.15, ease: [0, 0, 0.58, 1] };
  };

  // Size presets: display = audience top row, compact = small inline, hero = full-screen.
  // display: clamp lower bound is 100px so the ball can shrink into very short top sections.
  const ballSize = size === 'display'
    ? 'clamp(120px, 26vh, 300px)'
    : size === 'compact'
      ? 'clamp(60px, 10vh, 120px)'
      : 'clamp(280px, 40vw, 400px)';

  // Empty placeholder matches ball sizing so it never overflows its row.
  const emptySize = size === 'display'
    ? 'border-4'
    : size === 'compact'
      ? 'border-2'
      : 'border-8';

  // Text scales with ball size via container query units (cqi = % of container width)
  const columnFontSize = '12cqi';
  const numberFontSize = '38cqi';

  if (!ball) {
    // The placeholder "?" tracks the ball size via a percentage of the container width.
    // containerType: 'inline-size' enables cqi units on the child span.
    return (
      <div
        className={`${emptySize} rounded-full flex items-center justify-center border-dashed border-border`}
        style={{
          width: ballSize,
          height: ballSize,
          backgroundColor: 'var(--surface-elevated)',
          containerType: 'inline-size' as React.CSSProperties['containerType'],
        }}
        role="status"
        aria-label="Waiting for first ball"
      >
        <span style={{ fontSize: '38cqi' }} className="font-bold text-foreground-muted">?</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-label={`Ball ${ball.label}`}
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={ball.label}
          initial={getInitial()}
          animate={getAnimate()}
          exit={getExit()}
          transition={getTransition()}
          style={{
            width: ballSize,
            height: ballSize,
            borderRadius: '9999px',
            background: getBallBackground(ball.column),
            boxShadow: getBallBoxShadow(ball.column),
            color: getBallTextColor(ball.column),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'visible',
            fontWeight: 700,
            containerType: 'size' as React.CSSProperties['containerType'],
          }}
        >
          {/* White ring — hollow circle between outer sphere and inner face.
              Creates the classic 3-layer bingo ball look: sphere → ring → gap → face. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '74%',
              height: '74%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '9999px',
              zIndex: 1,
              pointerEvents: 'none',
              background: 'transparent',
              border: '4.5cqi solid rgba(255,255,255,0.85)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.10)',
            }}
          />

          {/* Inner white face — solid white circle where the number sits. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '60%',
              height: '60%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '9999px',
              zIndex: 1,
              pointerEvents: 'none',
              background: [
                'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
                'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.95) 45%, rgba(255,255,255,0.88) 100%)',
              ].join(', '),
              // Convex: light on top edge, shadow on bottom edge
              boxShadow: '0 -0.5cqi 1cqi rgba(255,255,255,0.60), 0 1cqi 2cqi rgba(0,0,0,0.15)',
            }}
          />

          {/* Ball content — above stripe */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <span
              style={{ fontSize: columnFontSize, fontWeight: 600, opacity: 0.9 }}
              aria-hidden="true"
            >
              {ball.column}
            </span>
            <span style={{ fontSize: numberFontSize }}>
              {ball.number}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

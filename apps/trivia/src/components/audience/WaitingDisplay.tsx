'use client';

import { useReducedMotion } from 'motion/react';

export interface WaitingDisplayProps {
  message: string;
  /** Room code to display prominently (Issue 2.5) */
  roomCode?: string;
}

/**
 * Cinematic waiting display for the audience view.
 *
 * Features (Issue 2.5 — Player Join Flow):
 * - Large "Trivia" wordmark in display font with breathing scale animation.
 * - Room code displayed prominently in large font when provided.
 * - Join URL: trivia.joolie-boolie.com/join shown below room code.
 * - Ambient gradient background with 20s loop animation.
 *
 * Reduced motion (Issue A-19):
 * - Ambient gradient: motion-reduce:animate-none (stops waiting-ambient keyframe).
 * - Breathing: motion-reduce:animate-none (stops waiting-breathe keyframe).
 * - Spinner: replaced with static dot when reduced motion is on.
 */
export function WaitingDisplay({ message, roomCode }: WaitingDisplayProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`flex flex-col items-center justify-center h-full text-center relative overflow-hidden ${
        shouldReduceMotion ? '' : 'trivia-ambient-bg'
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
      style={shouldReduceMotion ? { background: '#0a0b14', gap: '4vh' } : { gap: '4vh' }}
    >
      {/* Large "Trivia" wordmark with breathing animation */}
      <div
        className={`${shouldReduceMotion ? '' : '[animation:waiting-breathe_4s_ease-in-out_infinite]'}`}
        aria-hidden="true"
        style={shouldReduceMotion ? { opacity: 0.9 } : undefined}
      >
        <span
          className="font-bold text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(6rem, 18vw, 16rem)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #4F7BF7 0%, #7E52E4 60%, #A78BFA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Trivia
        </span>
      </div>

      {/* Room code — displayed prominently (Issue 2.5) */}
      {roomCode && (
        <div className="flex flex-col items-center" style={{ gap: 'clamp(6px, 1vh, 16px)' }}>
          <span
            className="text-foreground-secondary font-medium uppercase tracking-widest"
            style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)', letterSpacing: '0.15em' }}
          >
            Room Code
          </span>
          <span
            className="font-bold text-foreground font-mono"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(4rem, 10vw, 8rem)',
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #4F7BF7 0%, #7E52E4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            aria-label={`Room code: ${roomCode}`}
          >
            {roomCode}
          </span>
          {/* Join URL (Issue 2.5) */}
          <p
            className="text-foreground-secondary font-medium"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
          >
            trivia.joolie-boolie.com/join
          </p>
        </div>
      )}

      {/* Status message + spinner / dot */}
      <div className="flex flex-col items-center" style={{ gap: 'clamp(12px, 2vh, 24px)' }}>
        {shouldReduceMotion ? (
          <div
            className="rounded-full bg-primary"
            style={{ width: 'clamp(8px, 1vh, 16px)', height: 'clamp(8px, 1vh, 16px)' }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="rounded-full animate-spin motion-reduce:animate-none"
            style={{
              width: 'clamp(48px, 6vh, 80px)',
              height: 'clamp(48px, 6vh, 80px)',
              borderWidth: 'clamp(4px, 0.5vh, 8px)',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              borderTopColor: 'var(--primary)',
            }}
            aria-hidden="true"
          />
        )}
        <p
          className="text-foreground-secondary font-medium"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
        >
          {message}
        </p>
        <p
          className="text-foreground-secondary"
          style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)' }}
        >
          The game will appear here when the presenter is ready.
        </p>
      </div>
    </div>
  );
}

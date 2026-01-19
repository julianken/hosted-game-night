'use client';

import type { Question, Timer } from '@/types';
import { AudienceTimer } from './AudienceTimer';
import { AudienceAnswerOptions } from './AudienceAnswerOptions';
import { AudienceRoundInfo } from './AudienceRoundInfo';

export interface AudienceQuestionProps {
  /** The current question to display */
  question: Question;
  /** Current question number within the round (1-based) */
  questionNumber: number;
  /** Total questions in this round */
  totalQuestions: number;
  /** Current round number (1-based for display) */
  roundNumber: number;
  /** Total number of rounds */
  totalRounds: number;
  /** Timer state (optional - shows timer if provided) */
  timer?: Timer;
  /** Whether timer is visible per settings */
  timerVisible?: boolean;
  /** Currently revealed answer (null if not revealed yet) */
  revealedAnswer?: string | null;
}

// Category color mappings for visual distinction
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  music: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  movies: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  tv: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  history: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500' },
};

const defaultCategoryColor = { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' };

/**
 * Full-featured question display for audience/projector view.
 * Combines question text, timer, answer options, and round info.
 * Optimized for readability from 30+ feet away.
 *
 * Features:
 * - Large, readable question text
 * - Integrated countdown timer
 * - Color-coded answer options
 * - Round/question progress
 * - Category theming
 * - Smooth transitions
 * - High contrast dark theme support
 */
export function AudienceQuestion({
  question,
  questionNumber,
  totalQuestions,
  roundNumber,
  totalRounds,
  timer,
  timerVisible = true,
  revealedAnswer,
}: AudienceQuestionProps) {
  // Get category colors
  const categoryStyle = categoryColors[question.category] || defaultCategoryColor;

  return (
    <article
      className="flex flex-col h-full min-h-[80vh] py-4 gap-6 animate-in fade-in duration-500 motion-reduce:animate-none"
      role="region"
      aria-label={`Question ${questionNumber} of ${totalQuestions}, Round ${roundNumber}`}
    >
      {/* Header: Round info and Timer */}
      <header className="flex flex-col lg:flex-row items-center justify-between gap-6 px-4">
        {/* Round and question progress */}
        <div className="flex-1 w-full lg:w-auto">
          <AudienceRoundInfo
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            category={question.category}
          />
        </div>

        {/* Timer (if provided and visible) */}
        {timer && timerVisible && (
          <div className="flex-shrink-0">
            <AudienceTimer
              timer={timer}
              visible={timerVisible}
              size="compact"
              showStatus={false}
            />
          </div>
        )}
      </header>

      {/* Main content: Question text */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8">
        {/* Category badge with visual styling */}
        <div
          className={`
            mb-6 px-8 py-3 rounded-full border-2
            ${categoryStyle.bg} ${categoryStyle.border}
          `}
          aria-label={`Category: ${question.category}`}
        >
          <span className={`text-2xl lg:text-3xl font-bold capitalize ${categoryStyle.text}`}>
            {question.category}
          </span>
        </div>

        {/* Question text - largest element for maximum readability */}
        <h2
          id="current-question"
          className="text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-foreground text-center leading-tight max-w-6xl"
        >
          {question.text}
        </h2>
      </section>

      {/* Answer options section */}
      <section className="px-4 lg:px-8 pb-4">
        <div className="flex justify-center">
          <AudienceAnswerOptions
            type={question.type}
            options={question.options}
            optionTexts={question.optionTexts}
            revealedAnswer={revealedAnswer}
          />
        </div>
      </section>

      {/* Timer status (for large timer at bottom when answer options are shown) */}
      {timer && timerVisible && timer.remaining <= 0 && timer.duration > 0 && (
        <div
          className="text-center py-4 bg-red-500/10 border-t border-red-500/30"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-3xl lg:text-4xl font-bold text-red-500 motion-safe:animate-pulse">
            TIME IS UP!
          </span>
        </div>
      )}
    </article>
  );
}

'use client';

export interface AudienceRoundInfoProps {
  /** Current round number (1-based for display) */
  roundNumber: number;
  /** Total number of rounds */
  totalRounds: number;
  /** Current question number within the round (1-based) */
  questionNumber: number;
  /** Total questions in this round */
  totalQuestions: number;
  /** Optional category/theme for the current question */
  category?: string;
}

/**
 * Round and question progress display for audience view.
 * Optimized for projector visibility with large text (readable from 30+ feet).
 *
 * Features:
 * - Visual progress bar for questions in round
 * - Clear round/question counter
 * - Optional category badge
 * - High contrast design
 */
export function AudienceRoundInfo({
  roundNumber,
  totalRounds,
  questionNumber,
  totalQuestions,
  category,
}: AudienceRoundInfoProps) {
  // Calculate progress percentage for visual bar
  const progressPercentage = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <div
      className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto"
      role="region"
      aria-label={`Round ${roundNumber} of ${totalRounds}, Question ${questionNumber} of ${totalQuestions}`}
    >
      {/* Round and Question indicators */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        {/* Round indicator */}
        <div className="flex items-center gap-3">
          <span className="text-2xl lg:text-3xl font-medium text-muted-foreground">
            Round
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-bold text-foreground">
              {roundNumber}
            </span>
            <span className="text-2xl lg:text-3xl font-medium text-muted">
              /{totalRounds}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div
          className="hidden sm:block w-2 h-2 rounded-full bg-muted"
          aria-hidden="true"
        />

        {/* Question indicator */}
        <div className="flex items-center gap-3">
          <span className="text-2xl lg:text-3xl font-medium text-muted-foreground">
            Question
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-bold text-primary">
              {questionNumber}
            </span>
            <span className="text-2xl lg:text-3xl font-medium text-muted">
              /{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl px-4">
        <div
          className="h-4 lg:h-5 w-full rounded-full bg-muted/30 overflow-hidden"
          role="progressbar"
          aria-valuenow={questionNumber}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-label={`Question ${questionNumber} of ${totalQuestions}`}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Question dots */}
        <div className="flex justify-center gap-2 mt-3">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <div
              key={i}
              className={`
                w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-all duration-300
                ${i < questionNumber
                  ? 'bg-primary scale-100'
                  : i === questionNumber - 1
                    ? 'bg-primary scale-125 ring-2 ring-primary/30'
                    : 'bg-muted/40 scale-100'
                }
              `}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Category badge (if provided) */}
      {category && (
        <div
          className="px-6 py-2 rounded-full bg-primary/10 border border-primary/20"
          aria-label={`Category: ${category}`}
        >
          <span className="text-xl lg:text-2xl font-semibold text-primary capitalize">
            {category}
          </span>
        </div>
      )}
    </div>
  );
}

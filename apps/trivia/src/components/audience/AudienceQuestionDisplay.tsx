'use client';

import type { Question } from '@/types';

export interface AudienceQuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  roundNumber: number;
}

// Color-coded option badges for multiple choice
const optionColors: Record<string, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-red-600 text-white',
  C: 'bg-green-600 text-white',
  D: 'bg-orange-500 text-white',
};

/**
 * Large question display optimized for audience/projector view.
 * Designed to be readable from 30+ feet away.
 */
export function AudienceQuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  roundNumber,
}: AudienceQuestionDisplayProps) {
  const isMultipleChoice = question.type === 'multiple_choice';
  const isTrueFalse = question.type === 'true_false';

  return (
    <article
      className="flex flex-col items-center h-full min-h-[60vh] gap-8 animate-in fade-in duration-500 motion-reduce:animate-none"
      role="region"
      aria-label={`Question ${questionNumber} of ${totalQuestions}`}
    >
      {/* Round/Question indicator */}
      <div className="text-center" aria-live="polite">
        <p className="text-2xl lg:text-3xl text-muted-foreground font-medium">
          Round {roundNumber} &bull; Question {questionNumber} of {totalQuestions}
        </p>
      </div>

      {/* Category badge */}
      <div
        className="px-6 py-2 rounded-full bg-primary/10 text-primary text-xl lg:text-2xl font-semibold capitalize"
        aria-label={`Category: ${question.category}`}
      >
        {question.category}
      </div>

      {/* Question text */}
      <div className="flex-1 flex items-center justify-center max-w-5xl px-4">
        <h2
          id="current-question"
          className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground text-center leading-tight"
        >
          {question.text}
        </h2>
      </div>

      {/* Answer options */}
      <div
        className="w-full max-w-5xl px-4 pb-8"
        role="list"
        aria-label="Answer options"
      >
        {isMultipleChoice && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {question.options.map((option, index) => (
              <div
                key={option}
                role="listitem"
                aria-label={`Option ${option}: ${question.optionTexts[index]}`}
                className="flex items-center gap-4 p-4 lg:p-6 rounded-xl bg-muted/20 border-2 border-border hover:border-muted transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={`
                    ${optionColors[option] || 'bg-muted text-foreground'}
                    w-14 h-14 lg:w-16 lg:h-16 flex items-center justify-center
                    rounded-full text-2xl lg:text-3xl font-bold flex-shrink-0
                  `}
                >
                  {option}
                </span>
                <span className="text-2xl lg:text-3xl text-foreground font-medium">
                  {question.optionTexts[index]}
                </span>
              </div>
            ))}
          </div>
        )}

        {isTrueFalse && (
          <div className="flex flex-col sm:flex-row gap-4 lg:gap-8 justify-center">
            <div
              role="listitem"
              aria-label="Option: True"
              className="flex-1 max-w-md p-6 lg:p-8 rounded-xl bg-green-600/20 border-2 border-green-600 text-center"
            >
              <span className="text-4xl lg:text-5xl font-bold text-green-600">
                TRUE
              </span>
            </div>
            <div
              role="listitem"
              aria-label="Option: False"
              className="flex-1 max-w-md p-6 lg:p-8 rounded-xl bg-red-600/20 border-2 border-red-600 text-center"
            >
              <span className="text-4xl lg:text-5xl font-bold text-red-600">
                FALSE
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

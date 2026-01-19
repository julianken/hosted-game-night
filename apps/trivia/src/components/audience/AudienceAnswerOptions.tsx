'use client';

import type { QuestionType } from '@/types';

export interface AudienceAnswerOptionsProps {
  /** Question type determines layout */
  type: QuestionType;
  /** Option letters (e.g., ['A', 'B', 'C', 'D']) */
  options: string[];
  /** Human-readable option text for each option */
  optionTexts: string[];
  /** Whether to show reveal animation (when answer is shown) */
  revealedAnswer?: string | null;
}

// Color-coded option badges for multiple choice - optimized for dark theme projection
const optionColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
  B: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
  C: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-500' },
  D: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-400' },
};

// Default colors for options beyond A-D
const defaultOptionColor = { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500' };

/**
 * Answer options display optimized for audience/projector view.
 * Designed to be readable from 30+ feet away with high contrast colors.
 *
 * Features:
 * - Color-coded options (A=blue, B=red, C=green, D=orange)
 * - Large, readable text
 * - Responsive grid layout
 * - Optional answer reveal highlighting
 * - Support for multiple choice and true/false questions
 */
export function AudienceAnswerOptions({
  type,
  options,
  optionTexts,
  revealedAnswer,
}: AudienceAnswerOptionsProps) {
  const isMultipleChoice = type === 'multiple_choice';
  const isTrueFalse = type === 'true_false';

  // Multiple choice grid
  if (isMultipleChoice) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full max-w-5xl"
        role="list"
        aria-label="Answer options"
      >
        {options.map((option, index) => {
          const colors = optionColors[option] || defaultOptionColor;
          const isRevealed = revealedAnswer === option;

          return (
            <div
              key={option}
              role="listitem"
              aria-label={`Option ${option}: ${optionTexts[index]}`}
              className={`
                flex items-center gap-4 p-4 lg:p-6 rounded-xl
                border-2 transition-all duration-300
                ${isRevealed
                  ? `${colors.bg} ${colors.text} ring-4 ring-white/50 scale-105`
                  : `bg-muted/20 ${colors.border} hover:bg-muted/30`
                }
              `}
            >
              {/* Option badge */}
              <span
                aria-hidden="true"
                className={`
                  ${isRevealed ? 'bg-white/30' : colors.bg}
                  ${isRevealed ? 'text-white' : colors.text}
                  w-14 h-14 lg:w-16 lg:h-16 flex items-center justify-center
                  rounded-full text-2xl lg:text-3xl font-bold flex-shrink-0
                  transition-all duration-300
                `}
              >
                {option}
              </span>

              {/* Option text */}
              <span
                className={`
                  text-2xl lg:text-3xl font-medium leading-tight
                  ${isRevealed ? 'text-white' : 'text-foreground'}
                  transition-colors duration-300
                `}
              >
                {optionTexts[index]}
              </span>

              {/* Reveal indicator */}
              {isRevealed && (
                <span
                  className="ml-auto flex-shrink-0"
                  aria-label="Correct answer"
                >
                  <svg
                    className="w-10 h-10 lg:w-12 lg:h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // True/False layout
  if (isTrueFalse) {
    const isTrue = revealedAnswer === 'True';
    const isFalse = revealedAnswer === 'False';

    return (
      <div
        className="flex flex-col sm:flex-row gap-6 lg:gap-10 justify-center w-full max-w-4xl"
        role="list"
        aria-label="Answer options"
      >
        {/* True option */}
        <div
          role="listitem"
          aria-label="Option: True"
          className={`
            flex-1 max-w-md p-8 lg:p-10 rounded-2xl text-center
            border-4 transition-all duration-300
            ${isTrue
              ? 'bg-green-600 border-green-400 text-white ring-4 ring-white/50 scale-105'
              : 'bg-green-600/10 border-green-600'
            }
          `}
        >
          <span
            className={`
              text-5xl lg:text-6xl font-bold block
              ${isTrue ? 'text-white' : 'text-green-600'}
              transition-colors duration-300
            `}
          >
            TRUE
          </span>
          {isTrue && (
            <svg
              className="w-16 h-16 mx-auto mt-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>

        {/* False option */}
        <div
          role="listitem"
          aria-label="Option: False"
          className={`
            flex-1 max-w-md p-8 lg:p-10 rounded-2xl text-center
            border-4 transition-all duration-300
            ${isFalse
              ? 'bg-red-600 border-red-400 text-white ring-4 ring-white/50 scale-105'
              : 'bg-red-600/10 border-red-600'
            }
          `}
        >
          <span
            className={`
              text-5xl lg:text-6xl font-bold block
              ${isFalse ? 'text-white' : 'text-red-600'}
              transition-colors duration-300
            `}
          >
            FALSE
          </span>
          {isFalse && (
            <svg
              className="w-16 h-16 mx-auto mt-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return null;
}

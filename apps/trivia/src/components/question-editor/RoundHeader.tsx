'use client';

import type { CategoryFormData } from './QuestionSetEditorModal.utils';

interface RoundHeaderProps {
  roundIndex: number;
  round: CategoryFormData;
  questionCount: number;
  isCollapsed: boolean;
  canRemove: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
}

export function RoundHeader({
  roundIndex,
  round,
  questionCount,
  isCollapsed,
  canRemove,
  onToggleCollapse,
  onRemove,
}: RoundHeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse();
    }
  };

  return (
    <div
      className="flex items-center justify-between min-h-[var(--size-touch)] px-4 py-3 bg-muted/50 border-b border-border rounded-t-lg hover:bg-muted/70 transition-colors cursor-pointer"
      onClick={onToggleCollapse}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={`${round.name}, ${questionCount} question${questionCount !== 1 ? 's' : ''}. ${isCollapsed ? 'Expand' : 'Collapse'} round`}
    >
      {/* Left section: Round title and badge */}
      <div className="flex items-center gap-3">
        {/* Collapse/expand chevron */}
        <span
          aria-hidden="true"
          className="text-muted-foreground transition-transform duration-200"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>

        {/* Round title */}
        <h3 className="text-lg font-semibold">
          Round {roundIndex + 1}: {round.name}
        </h3>

        {/* Question count badge */}
        <span
          className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
          aria-label={`${questionCount} question${questionCount !== 1 ? 's' : ''}`}
        >
          {questionCount}
        </span>
      </div>

      {/* Right section: Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={!canRemove}
        className={`
          min-h-[var(--size-touch)] min-w-[var(--size-touch)] px-3 py-2 text-sm font-medium rounded-lg
          transition-colors
          ${
            canRemove
              ? 'text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              : 'text-muted-foreground cursor-not-allowed opacity-50'
          }
        `}
        aria-label={canRemove ? `Remove ${round.name}` : 'Cannot remove last round'}
        title={canRemove ? 'Remove round' : 'Cannot remove the last round'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

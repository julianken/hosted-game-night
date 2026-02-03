'use client';

import { useState, useEffect } from 'react';

export interface RoundHeaderProps {
  roundNumber: number;
  questionCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}

/**
 * RoundHeader - Header component for a round showing title, question count, and controls.
 * Provides collapse/expand toggle and remove functionality.
 */
export function RoundHeader({
  roundNumber,
  questionCount,
  isCollapsed,
  onToggle,
  onRemove,
  canRemove,
  disabled = false,
}: RoundHeaderProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRemoveClick = () => {
    // Show confirmation dialog if round has questions
    if (questionCount > 0) {
      setShowConfirmDialog(true);
    } else {
      onRemove();
    }
  };

  const handleConfirmRemove = () => {
    setShowConfirmDialog(false);
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };

  // Handle keyboard events when the dialog is shown
  useEffect(() => {
    if (showConfirmDialog) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowConfirmDialog(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [showConfirmDialog]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
        <button
          type="button"
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 min-h-[56px] text-left text-base font-medium flex items-center gap-3 hover:bg-muted/70 transition-colors rounded px-2 -mx-2"
          aria-expanded={isCollapsed ? 'false' : 'true'}
          aria-label={`Round ${roundNumber}, ${questionCount} questions. Press to ${isCollapsed ? 'expand' : 'collapse'}`}
        >
          <span aria-hidden="true" className="text-lg">
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="text-lg">Round {roundNumber}</span>
          <span
            className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-primary/10 text-primary text-sm font-semibold"
            aria-label={`${questionCount} questions`}
          >
            {questionCount}
          </span>
        </button>
        <button
          type="button"
          onClick={handleRemoveClick}
          disabled={disabled || !canRemove}
          className={`
            min-h-[44px] min-w-[44px] px-3
            text-sm font-medium rounded-lg
            text-destructive hover:bg-destructive/10
            focus:outline-none focus:ring-4 focus:ring-destructive/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
          aria-label={`Remove Round ${roundNumber}`}
        >
          Remove
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
        >
          <div className="bg-background border-2 border-border rounded-lg shadow-lg p-6 max-w-md mx-4">
            <h2 id="confirm-remove-title" className="text-xl font-bold mb-4">
              Remove Round {roundNumber}?
            </h2>
            <p className="text-base mb-6">
              This round contains {questionCount} question{questionCount !== 1 ? 's' : ''}.
              Are you sure you want to remove it?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className={`
                  min-h-[44px] min-w-[44px] px-4 py-2
                  text-base font-medium rounded-lg
                  bg-muted text-foreground
                  hover:bg-muted/80
                  focus:outline-none focus:ring-4 focus:ring-primary/50
                  transition-colors
                `}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className={`
                  min-h-[44px] min-w-[44px] px-4 py-2
                  text-base font-medium rounded-lg
                  bg-destructive text-destructive-foreground
                  hover:bg-destructive/90
                  focus:outline-none focus:ring-4 focus:ring-destructive/50
                  transition-colors
                `}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

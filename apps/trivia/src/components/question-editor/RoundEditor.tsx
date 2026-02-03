'use client';

import { RoundHeader } from './RoundHeader';
import type { CategoryFormData } from './QuestionSetEditorModal.utils';

export interface RoundEditorProps {
  roundIndex: number;
  round: CategoryFormData;
  onUpdateRound: (field: 'name', value: string) => void;
  onRemoveRound: () => void;
  onAddQuestion: () => void;
  canRemove: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * RoundEditor - Component for editing a round (category) of questions.
 * Displays round header with controls and contains question list.
 */
export function RoundEditor({
  roundIndex,
  round,
  onUpdateRound: _onUpdateRound,
  onRemoveRound,
  onAddQuestion,
  canRemove,
  isCollapsed,
  onToggleCollapse,
  disabled = false,
  children,
}: RoundEditorProps) {
  const roundNumber = roundIndex + 1;
  const questionCount = round.questions.length;

  return (
    <div
      className="border-2 border-border rounded-lg overflow-hidden"
      role="region"
      aria-label={`Round ${roundNumber}`}
    >
      <RoundHeader
        roundNumber={roundNumber}
        questionCount={questionCount}
        isCollapsed={isCollapsed}
        onToggle={onToggleCollapse}
        onRemove={onRemoveRound}
        canRemove={canRemove}
        disabled={disabled}
      />

      {/* Round Content */}
      {!isCollapsed && (
        <div className="px-4 py-4 space-y-4">
          {/* Empty State */}
          {questionCount === 0 && (
            <div className="py-8 text-center">
              <p className="text-base text-muted-foreground">
                No questions yet. Add your first question.
              </p>
            </div>
          )}

          {/* Questions (rendered via children) */}
          {questionCount > 0 && (
            <div className="space-y-3">
              {children}
            </div>
          )}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={onAddQuestion}
            disabled={disabled}
            className={`
              w-full min-h-[44px] px-4 py-2
              text-base font-medium rounded-lg
              border-2 border-dashed border-border
              hover:border-primary hover:bg-primary/5
              focus:outline-none focus:ring-4 focus:ring-primary/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            aria-label={`Add question to Round ${roundNumber}`}
          >
            + Add Question
          </button>
        </div>
      )}
    </div>
  );
}

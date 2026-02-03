'use client';

import { useState } from 'react';
import type { CategoryFormData, QuestionFormData } from './QuestionSetEditorModal.utils';
import { hasRoundContent } from './QuestionSetEditorModal.utils';
import { RoundHeader } from './RoundHeader';

interface RoundEditorProps {
  roundIndex: number;
  round: CategoryFormData;
  onUpdateRound: (updatedRound: CategoryFormData) => void;
  onRemoveRound: () => void;
  canRemove: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function RoundEditor({
  roundIndex,
  round,
  onUpdateRound,
  onRemoveRound,
  canRemove,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse: controlledToggleCollapse,
}: RoundEditorProps) {
  // Allow controlled or uncontrolled collapse state
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed;
  const toggleCollapse = controlledToggleCollapse ?? (() => setInternalIsCollapsed(!internalIsCollapsed));

  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);

  const handleRemoveClick = () => {
    // If the round has content, show confirmation dialog
    if (hasRoundContent(round)) {
      setShowRemoveConfirmation(true);
    } else {
      // If no content, remove immediately
      onRemoveRound();
    }
  };

  const handleConfirmRemove = () => {
    setShowRemoveConfirmation(false);
    onRemoveRound();
  };

  const handleCancelRemove = () => {
    setShowRemoveConfirmation(false);
  };

  const handleAddQuestion = () => {
    const newQuestion: QuestionFormData = {
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    };
    onUpdateRound({
      ...round,
      questions: [...round.questions, newQuestion],
    });
  };

  return (
    <div className="border border-border rounded-lg mb-4 bg-card">
      {/* Header */}
      <RoundHeader
        roundIndex={roundIndex}
        round={round}
        questionCount={round.questions.length}
        isCollapsed={isCollapsed}
        canRemove={canRemove}
        onToggleCollapse={toggleCollapse}
        onRemove={handleRemoveClick}
      />

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Questions list */}
          {round.questions.length > 0 ? (
            <div className="space-y-3" role="list" aria-label={`Questions in ${round.name}`}>
              {round.questions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="p-3 border border-border rounded-lg bg-muted/20"
                  role="listitem"
                  aria-label={`Question ${qIndex + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Question {qIndex + 1}
                    </span>
                  </div>
                  <p className="text-base">
                    {question.question || (
                      <span className="text-muted-foreground italic">No question text</span>
                    )}
                  </p>
                  {question.options.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {question.options.map((option, oIndex) => (
                        <li
                          key={oIndex}
                          className={`${
                            oIndex === question.correctIndex
                              ? 'font-semibold text-green-600 dark:text-green-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + oIndex)}. {option || <span className="italic">(empty)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-3 opacity-20" aria-hidden="true">
                ?
              </div>
              <p className="text-base text-muted-foreground">
                No questions yet. Add your first question.
              </p>
            </div>
          )}

          {/* Add question button */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full min-h-[var(--size-touch)] px-4 py-3 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={`Add question to ${round.name}`}
          >
            Add Question
          </button>
        </div>
      )}

      {/* Remove confirmation dialog */}
      {showRemoveConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-round-dialog-title"
        >
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h2
              id="remove-round-dialog-title"
              className="text-xl font-semibold mb-3"
            >
              Remove Round?
            </h2>
            <p className="text-base text-muted-foreground mb-6">
              This round contains {round.questions.length} question
              {round.questions.length !== 1 ? 's' : ''}. Are you sure you want to
              remove it? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelRemove}
                className="min-h-[var(--size-touch)] px-4 py-2 text-base font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="min-h-[var(--size-touch)] px-4 py-2 text-base font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Remove Round
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

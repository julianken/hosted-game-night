'use client';

import { useState, useEffect } from 'react';
import type { CategoryFormData, QuestionFormData } from './QuestionSetEditorModal.utils';
import { hasRoundContent, createEmptyQuestion } from './QuestionSetEditorModal.utils';
import { RoundHeader } from './RoundHeader';
import { QuestionEditor } from './QuestionEditor';

/**
 * Valid category IDs for the nested structure
 */
const CATEGORY_OPTIONS = [
  { id: 'general_knowledge', name: 'General Knowledge' },
  { id: 'science', name: 'Science & Nature' },
  { id: 'history', name: 'History' },
  { id: 'geography', name: 'Geography' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'sports', name: 'Sports' },
  { id: 'art_literature', name: 'Art & Literature' },
];

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

  // Handle escape key for confirmation dialog
  useEffect(() => {
    if (!showRemoveConfirmation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRemoveConfirmation(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showRemoveConfirmation]);

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
    onUpdateRound({
      ...round,
      questions: [...round.questions, createEmptyQuestion()],
    });
  };

  const handleUpdateQuestion = (qIndex: number, updatedQuestion: QuestionFormData) => {
    const newQuestions = [...round.questions];
    newQuestions[qIndex] = updatedQuestion;
    onUpdateRound({ ...round, questions: newQuestions });
  };

  const handleRemoveQuestion = (qIndex: number) => {
    const newQuestions = round.questions.filter((_, i) => i !== qIndex);
    onUpdateRound({ ...round, questions: newQuestions });
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
    onUpdateRound({
      ...round,
      id: categoryId,
      name: category?.name || round.name,
    });
  };

  const handleNameChange = (name: string) => {
    onUpdateRound({ ...round, name });
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
          {/* Category selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor={`round-${roundIndex}-category`}
                className="text-sm font-medium text-muted-foreground"
              >
                Category
              </label>
              <select
                id={`round-${roundIndex}-category`}
                value={round.id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 min-h-[var(--size-touch)] text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                {/* Show current custom ID if not in standard list */}
                {!CATEGORY_OPTIONS.some((c) => c.id === round.id) && (
                  <option value={round.id}>{round.name} (Custom)</option>
                )}
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`round-${roundIndex}-name`}
                className="text-sm font-medium text-muted-foreground"
              >
                Display Name
              </label>
              <input
                id={`round-${roundIndex}-name`}
                type="text"
                value={round.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Round 1: Science"
                className="w-full px-3 py-2 min-h-[var(--size-touch)] text-base rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* Questions list */}
          {round.questions.length > 0 ? (
            <div className="space-y-4" role="list" aria-label={`Questions in ${round.name}`}>
              {round.questions.map((question, qIndex) => (
                <QuestionEditor
                  key={qIndex}
                  questionIndex={qIndex}
                  question={question}
                  onUpdateQuestion={(updated) => handleUpdateQuestion(qIndex, updated)}
                  onRemoveQuestion={() => handleRemoveQuestion(qIndex)}
                  canRemove={round.questions.length > 0}
                />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg">
              <div className="text-4xl mb-3 opacity-20" aria-hidden="true">
                ?
              </div>
              <p className="text-base text-muted-foreground">
                No questions yet. Add your first question below.
              </p>
            </div>
          )}

          {/* Add question button */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full min-h-[var(--size-touch)] px-4 py-3 text-base font-medium rounded-lg border-2 border-dashed border-primary/50 text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            aria-label={`Add question to ${round.name}`}
          >
            <span className="text-xl">+</span>
            <span>Add Question</span>
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
              Remove Category?
            </h2>
            <p className="text-base text-muted-foreground mb-6">
              This category contains {round.questions.length} question
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
                Remove Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

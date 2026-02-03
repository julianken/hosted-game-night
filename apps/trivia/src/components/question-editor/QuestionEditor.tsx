'use client';

import { useCallback } from 'react';
import type { QuestionFormData } from './QuestionSetEditorModal.utils';
import { OptionsEditor } from './OptionsEditor';

/**
 * QuestionEditor - Edit a single question within a category
 *
 * Features:
 * - Question text input
 * - Question type selector (multiple choice / true-false)
 * - Options editor with correct answer selection
 * - Delete question button
 * - Real-time validation display
 */

interface QuestionEditorProps {
  questionIndex: number;
  question: QuestionFormData;
  onUpdateQuestion: (question: QuestionFormData) => void;
  onRemoveQuestion: () => void;
  canRemove: boolean;
}

export function QuestionEditor({
  questionIndex,
  question,
  onUpdateQuestion,
  onRemoveQuestion,
  canRemove,
}: QuestionEditorProps) {
  // Detect question type based on options
  const questionType: 'multiple_choice' | 'true_false' =
    question.options.length === 2 &&
    question.options[0].toLowerCase() === 'true' &&
    question.options[1].toLowerCase() === 'false'
      ? 'true_false'
      : 'multiple_choice';

  const handleQuestionTextChange = useCallback((text: string) => {
    onUpdateQuestion({ ...question, question: text });
  }, [question, onUpdateQuestion]);

  const handleOptionsChange = useCallback((options: string[]) => {
    onUpdateQuestion({ ...question, options });
  }, [question, onUpdateQuestion]);

  const handleCorrectIndexChange = useCallback((correctIndex: number) => {
    onUpdateQuestion({ ...question, correctIndex });
  }, [question, onUpdateQuestion]);

  const handleTypeChange = useCallback((type: 'multiple_choice' | 'true_false') => {
    if (type === 'true_false') {
      onUpdateQuestion({
        ...question,
        options: ['True', 'False'],
        correctIndex: 0,
      });
    } else {
      onUpdateQuestion({
        ...question,
        options: ['', '', '', ''],
        correctIndex: 0,
      });
    }
  }, [question, onUpdateQuestion]);

  // Simple validation
  const isQuestionEmpty = !question.question.trim();
  const hasEmptyOptions = questionType === 'multiple_choice' &&
    question.options.some((opt) => !opt.trim());

  return (
    <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-4">
      {/* Header with question number and delete button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Question {questionIndex + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemoveQuestion}
            className="min-h-[var(--size-touch)] min-w-[var(--size-touch)] px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
            aria-label={`Remove question ${questionIndex + 1}`}
          >
            Remove
          </button>
        )}
      </div>

      {/* Question text */}
      <div className="space-y-2">
        <label
          htmlFor={`question-${questionIndex}-text`}
          className="text-sm font-medium text-muted-foreground"
        >
          Question Text <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`question-${questionIndex}-text`}
          value={question.question}
          onChange={(e) => handleQuestionTextChange(e.target.value)}
          placeholder="Enter your question here..."
          rows={2}
          className={`
            w-full px-3 py-2 min-h-[80px] text-base rounded-lg border
            bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            resize-y
            ${isQuestionEmpty ? 'border-amber-400' : 'border-border'}
          `}
          aria-invalid={isQuestionEmpty}
        />
        {isQuestionEmpty && (
          <p className="text-xs text-amber-600">Question text is required</p>
        )}
      </div>

      {/* Question type selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Question Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('multiple_choice')}
            className={`
              flex-1 min-h-[var(--size-touch)] px-4 py-2 text-sm font-medium rounded-lg border transition-colors
              ${questionType === 'multiple_choice'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-muted-foreground'
              }
            `}
          >
            Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('true_false')}
            className={`
              flex-1 min-h-[var(--size-touch)] px-4 py-2 text-sm font-medium rounded-lg border transition-colors
              ${questionType === 'true_false'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-muted-foreground'
              }
            `}
          >
            True / False
          </button>
        </div>
      </div>

      {/* Options editor */}
      <OptionsEditor
        options={question.options}
        correctIndex={question.correctIndex}
        questionType={questionType}
        onUpdateOptions={handleOptionsChange}
        onUpdateCorrectIndex={handleCorrectIndexChange}
      />

      {/* Validation warning for empty options */}
      {hasEmptyOptions && (
        <p className="text-xs text-amber-600">
          All options should have text
        </p>
      )}
    </div>
  );
}

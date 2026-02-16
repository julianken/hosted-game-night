'use client';

import { useId, useState, useEffect, useCallback } from 'react';
import type { QuestionCategory, QuestionType } from '@/types';
import type { QuestionFormData } from './QuestionSetEditorModal.utils';
import { Button } from '@beak-gaming/ui';
import { OptionsEditor } from './OptionsEditor';
import { CategorySelector } from './CategorySelector';

export interface QuestionEditorProps {
  question: QuestionFormData;
  questionIndex: number;
  roundIndex: number;
  onUpdateQuestion: (question: QuestionFormData) => void;
  onRemoveQuestion: () => void;
  canRemove: boolean;
  disabled?: boolean;
}

/**
 * Validation constraints
 */
const VALIDATION = {
  QUESTION_MIN_LENGTH: 3,
  QUESTION_MAX_LENGTH: 500,
  OPTION_MAX_LENGTH: 200,
} as const;

/**
 * Question type display names
 */
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
};

/**
 * Validation errors for a question
 */
interface ValidationErrors {
  question?: string;
  options?: { [key: number]: string };
  category?: string;
  explanation?: string;
}

/**
 * QuestionEditor component with form fields, validation, and type switching.
 * Supports Multiple Choice and True/False question types.
 */
export function QuestionEditor({
  question,
  questionIndex,
  roundIndex,
  onUpdateQuestion,
  onRemoveQuestion,
  canRemove,
  disabled = false,
}: QuestionEditorProps) {
  const baseId = useId();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    question: false,
    options: false,
    explanation: false,
  });

  // Get question type and category from question data
  const questionType: QuestionType = question.type;
  const category: QuestionCategory = question.category;

  /**
   * Validate question text
   */
  const validateQuestionText = (text: string): string | undefined => {
    if (!text.trim()) {
      return 'Question text is required';
    }
    if (text.trim().length < VALIDATION.QUESTION_MIN_LENGTH) {
      return `Question must be at least ${VALIDATION.QUESTION_MIN_LENGTH} characters`;
    }
    if (text.length > VALIDATION.QUESTION_MAX_LENGTH) {
      return `Question must not exceed ${VALIDATION.QUESTION_MAX_LENGTH} characters`;
    }
    return undefined;
  };

  /**
   * Validate options
   */
  const validateOptions = (
    options: string[],
    type: QuestionType
  ): { [key: number]: string } | undefined => {
    const optionErrors: { [key: number]: string } = {};

    if (type === 'multiple_choice') {
      options.forEach((option, index) => {
        const trimmed = option.trim();
        if (!trimmed) {
          optionErrors[index] = `Option ${String.fromCharCode(65 + index)} is required`;
        } else if (option.length > VALIDATION.OPTION_MAX_LENGTH) {
          optionErrors[index] = `Option must not exceed ${VALIDATION.OPTION_MAX_LENGTH} characters`;
        }
      });
    }

    return Object.keys(optionErrors).length > 0 ? optionErrors : undefined;
  };

  /**
   * Run validation and update errors
   */
  const validate = useCallback(() => {
    const newErrors: ValidationErrors = {};

    // Validate question text
    const questionError = validateQuestionText(question.question);
    if (questionError) {
      newErrors.question = questionError;
    }

    // Validate options
    const optionsErrors = validateOptions(question.options, questionType);
    if (optionsErrors) {
      newErrors.options = optionsErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [question.question, question.options, questionType]);

  /**
   * Handle question text change
   */
  const handleQuestionChange = (text: string) => {
    onUpdateQuestion({
      ...question,
      question: text,
    });
    setTouched((prev) => ({ ...prev, question: true }));
  };

  /**
   * Handle question type change
   */
  const handleTypeChange = (newType: QuestionType) => {
    let newOptions: string[];
    let newCorrectIndex: number;

    if (newType === 'true_false') {
      // Convert to True/False
      newOptions = ['True', 'False'];
      newCorrectIndex = 0; // Default to True
    } else {
      // Convert to Multiple Choice
      // Preserve existing options if coming from T/F, or reset if invalid
      if (questionType === 'true_false') {
        newOptions = ['', '', '', ''];
        newCorrectIndex = 0;
      } else {
        newOptions = question.options;
        newCorrectIndex = question.correctIndex;
      }
    }

    onUpdateQuestion({
      ...question,
      type: newType,
      options: newOptions,
      correctIndex: newCorrectIndex,
    });
    setTouched((prev) => ({ ...prev, options: true }));
  };

  /**
   * Handle options change
   */
  const handleOptionsChange = (newOptions: string[]) => {
    onUpdateQuestion({
      ...question,
      options: newOptions,
    });
    setTouched((prev) => ({ ...prev, options: true }));
  };

  /**
   * Handle correct answer change
   */
  const handleCorrectIndexChange = (index: number) => {
    onUpdateQuestion({
      ...question,
      correctIndex: index,
    });
  };

  /**
   * Handle category change
   */
  const handleCategoryChange = (newCategory: QuestionCategory) => {
    onUpdateQuestion({
      ...question,
      category: newCategory,
    });
  };

  /**
   * Handle explanation change
   */
  const handleExplanationChange = (newExplanation: string) => {
    onUpdateQuestion({
      ...question,
      explanation: newExplanation,
    });
    setTouched((prev) => ({ ...prev, explanation: true }));
  };

  // Run validation when touched fields change
  useEffect(() => {
    if (touched.question || touched.options) {
      validate();
    }
  }, [question.question, question.options, touched.question, touched.options, validate]);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Question {questionIndex + 1}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            (Round {roundIndex + 1})
          </span>
        </h3>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onRemoveQuestion}
          disabled={disabled || !canRemove}
          aria-label={`Remove question ${questionIndex + 1}`}
        >
          Remove
        </Button>
      </div>

      {/* Question Text */}
      <div className="w-full">
        <label
          htmlFor={`${baseId}-question`}
          className="block mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Question Text
          <span className="ml-1 text-error" aria-label="required">
            *
          </span>
        </label>
        <input
          id={`${baseId}-question`}
          type="text"
          value={question.question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, question: true }))}
          disabled={disabled}
          placeholder="Enter your question..."
          maxLength={VALIDATION.QUESTION_MAX_LENGTH}
          required
          aria-invalid={!!errors.question}
          aria-describedby={errors.question ? `${baseId}-question-error` : undefined}
          className={`
            w-full
            min-h-[56px]
            px-4 py-3
            text-lg
            bg-white dark:bg-gray-800
            border-2 rounded-lg
            transition-colors
            focus:outline-none focus:ring-4
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-muted-foreground
            ${
              errors.question
                ? 'border-error focus:border-error focus:ring-error/50'
                : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary/50'
            }
          `.trim()}
        />
        {errors.question && (
          <p id={`${baseId}-question-error`} className="mt-2 text-base text-error" role="alert">
            {errors.question}
          </p>
        )}
        <p className="mt-1 text-base text-muted-foreground">
          {question.question.length}/{VALIDATION.QUESTION_MAX_LENGTH} characters
        </p>
      </div>

      {/* Question Type Selector */}
      <div className="w-full">
        <label
          htmlFor={`${baseId}-type`}
          className="block mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Question Type
        </label>
        <select
          id={`${baseId}-type`}
          value={questionType}
          onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          disabled={disabled}
          className="
            w-full
            min-h-[56px]
            px-4 py-3
            text-lg
            bg-white dark:bg-gray-800
            border-2 border-gray-300 dark:border-gray-600
            rounded-lg
            transition-colors
            focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <option value="multiple_choice">{QUESTION_TYPE_LABELS.multiple_choice}</option>
          <option value="true_false">{QUESTION_TYPE_LABELS.true_false}</option>
        </select>
      </div>

      {/* Options Editor */}
      <OptionsEditor
        questionType={questionType}
        options={question.options}
        correctIndex={question.correctIndex}
        onOptionsChange={handleOptionsChange}
        onCorrectIndexChange={handleCorrectIndexChange}
        disabled={disabled}
        errors={errors.options}
      />

      {/* Category Selector */}
      <CategorySelector
        label="Category"
        value={category}
        onChange={handleCategoryChange}
        disabled={disabled}
        required
      />

      {/* Optional Explanation */}
      <div className="w-full">
        <label
          htmlFor={`${baseId}-explanation`}
          className="block mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Explanation
          <span className="ml-2 text-base font-normal text-muted-foreground">
            (Optional)
          </span>
        </label>
        <textarea
          id={`${baseId}-explanation`}
          value={question.explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, explanation: true }))}
          disabled={disabled}
          placeholder="Add an explanation shown after the answer is revealed..."
          maxLength={500}
          rows={3}
          className="
            w-full
            min-h-[56px]
            px-4 py-3
            text-lg
            bg-white dark:bg-gray-800
            border-2 border-gray-300 dark:border-gray-600
            rounded-lg
            transition-colors
            focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-muted-foreground
            resize-none
          "
        />
      </div>
    </div>
  );
}

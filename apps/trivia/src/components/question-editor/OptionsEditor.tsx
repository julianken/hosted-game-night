'use client';

import { useId } from 'react';
import type { QuestionType } from '@/types';
import { Button } from '@joolie-boolie/ui';

export interface OptionsEditorProps {
  questionType: QuestionType;
  options: string[];
  correctIndex: number;
  onOptionsChange: (options: string[]) => void;
  onCorrectIndexChange: (index: number) => void;
  disabled?: boolean;
  errors?: { [key: number]: string }; // Option index -> error message
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const satisfies readonly string[];
const TRUE_FALSE_OPTIONS = ['True', 'False'] as const satisfies readonly string[];
const MIN_MULTIPLE_CHOICE_OPTIONS = 2;
const MAX_MULTIPLE_CHOICE_OPTIONS = 4;

/**
 * Options editor for question editor.
 * Supports Multiple Choice (2-4 options) and True/False (fixed 2 options).
 */
export function OptionsEditor({
  questionType,
  options,
  correctIndex,
  onOptionsChange,
  onCorrectIndexChange,
  disabled = false,
  errors = {},
}: OptionsEditorProps) {
  const baseId = useId();

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onOptionsChange(newOptions);
  };

  const handleAddOption = () => {
    if (questionType === 'multiple_choice' && options.length < MAX_MULTIPLE_CHOICE_OPTIONS) {
      onOptionsChange([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (questionType === 'multiple_choice' && options.length > MIN_MULTIPLE_CHOICE_OPTIONS) {
      const newOptions = options.filter((_, i) => i !== index);
      onOptionsChange(newOptions);

      // Adjust correct index if needed
      if (correctIndex === index) {
        onCorrectIndexChange(0);
      } else if (correctIndex > index) {
        onCorrectIndexChange(correctIndex - 1);
      }
    }
  };

  // True/False mode
  if (questionType === 'true_false') {
    return (
      <div className="w-full">
        <fieldset>
          <legend className="block mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Answer Options
          </legend>

          <div className="space-y-3">
            {TRUE_FALSE_OPTIONS.map((optionText, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="radio"
                  id={`${baseId}-option-${index}`}
                  name={`${baseId}-correct-answer`}
                  checked={correctIndex === index}
                  onChange={() => onCorrectIndexChange(index)}
                  disabled={disabled}
                  className="
                    w-6 h-6
                    text-primary
                    focus:ring-4 focus:ring-primary/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    cursor-pointer
                  "
                  aria-label={`Mark "${optionText}" as correct answer`}
                />
                <label
                  htmlFor={`${baseId}-option-${index}`}
                  className="
                    flex-1
                    min-h-[56px]
                    px-4 py-3
                    text-lg font-medium
                    bg-gray-100 dark:bg-gray-800
                    border-2 border-gray-300 dark:border-gray-600
                    rounded-lg
                    flex items-center
                    cursor-pointer
                  "
                >
                  {optionText}
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      </div>
    );
  }

  // Multiple Choice mode
  return (
    <div className="w-full">
      <fieldset>
        <legend className="block mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Answer Options
          <span className="ml-2 text-base font-normal text-muted-foreground">
            (Select the correct answer)
          </span>
        </legend>

        <div className="space-y-3">
          {options.map((option, index) => {
            const optionId = `${baseId}-option-${index}`;
            const hasError = !!errors[index];

            return (
              <div key={index} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {/* Radio button for correct answer */}
                  <input
                    type="radio"
                    id={`${baseId}-radio-${index}`}
                    name={`${baseId}-correct-answer`}
                    checked={correctIndex === index}
                    onChange={() => onCorrectIndexChange(index)}
                    disabled={disabled}
                    className="
                      w-6 h-6
                      text-primary
                      focus:ring-4 focus:ring-primary/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      cursor-pointer
                    "
                    aria-label={`Mark option ${OPTION_LABELS[index]} as correct answer`}
                  />

                  {/* Option label */}
                  <span
                    className="
                      flex items-center justify-center
                      w-10 h-10
                      text-base font-bold
                      bg-gray-200 dark:bg-gray-700
                      text-gray-900 dark:text-gray-100
                      rounded-lg
                    "
                    aria-hidden="true"
                  >
                    {OPTION_LABELS[index]}
                  </span>

                  {/* Option text input */}
                  <input
                    id={optionId}
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    disabled={disabled}
                    placeholder={`Option ${OPTION_LABELS[index]}`}
                    maxLength={200}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? `${optionId}-error` : undefined}
                    className={`
                      flex-1
                      min-h-[56px]
                      px-4 py-3
                      text-lg
                      bg-white dark:bg-gray-800
                      border-2 rounded-lg
                      transition-colors
                      focus:outline-none focus:ring-4
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        hasError
                          ? 'border-error focus:border-error focus:ring-error/50'
                          : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary/50'
                      }
                    `.trim()}
                  />

                  {/* Remove button (only show if more than min options) */}
                  {options.length > MIN_MULTIPLE_CHOICE_OPTIONS && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={disabled}
                      aria-label={`Remove option ${OPTION_LABELS[index]}`}
                      className="shrink-0"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {/* Error message */}
                {hasError && (
                  <p id={`${optionId}-error`} className="ml-14 text-base text-error" role="alert">
                    {errors[index]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add option button (only show if less than max options) */}
        {options.length < MAX_MULTIPLE_CHOICE_OPTIONS && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddOption}
            disabled={disabled}
            className="mt-3"
          >
            + Add Option ({options.length}/{MAX_MULTIPLE_CHOICE_OPTIONS})
          </Button>
        )}
      </fieldset>
    </div>
  );
}

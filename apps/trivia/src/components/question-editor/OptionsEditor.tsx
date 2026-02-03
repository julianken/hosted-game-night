'use client';

/**
 * OptionsEditor - Edit multiple choice options and select correct answer
 *
 * Supports:
 * - Multiple Choice: 2-4 options with A/B/C/D labels
 * - True/False: Fixed two options
 * - Radio buttons to select correct answer
 */

interface OptionsEditorProps {
  options: string[];
  correctIndex: number;
  questionType: 'multiple_choice' | 'true_false';
  onUpdateOptions: (options: string[]) => void;
  onUpdateCorrectIndex: (index: number) => void;
  disabled?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function OptionsEditor({
  options,
  correctIndex,
  questionType,
  onUpdateOptions,
  onUpdateCorrectIndex,
  disabled = false,
}: OptionsEditorProps) {
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onUpdateOptions(newOptions);
  };

  const handleAddOption = () => {
    if (options.length < 4) {
      onUpdateOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      onUpdateOptions(newOptions);
      // Adjust correctIndex if needed
      if (correctIndex >= newOptions.length) {
        onUpdateCorrectIndex(newOptions.length - 1);
      } else if (correctIndex > index) {
        onUpdateCorrectIndex(correctIndex - 1);
      }
    }
  };

  // True/False has fixed options
  if (questionType === 'true_false') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Correct Answer
        </label>
        <div className="flex gap-4">
          {['True', 'False'].map((label, index) => (
            <label
              key={label}
              className={`
                flex items-center gap-2 px-4 py-3 min-h-[var(--size-touch)] rounded-lg border cursor-pointer transition-colors
                ${correctIndex === index
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-border hover:border-muted-foreground'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="correct-answer"
                checked={correctIndex === index}
                onChange={() => onUpdateCorrectIndex(index)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="text-base font-medium">{label}</span>
              {correctIndex === index && (
                <span className="text-green-600 dark:text-green-400">✓</span>
              )}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Multiple choice options
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Options ({options.length}/4)
        </label>
        {options.length < 4 && !disabled && (
          <button
            type="button"
            onClick={handleAddOption}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            + Add Option
          </button>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Radio button to select correct answer */}
            <label
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-colors shrink-0
                ${correctIndex === index
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-border hover:border-green-400 hover:bg-green-500/10'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={correctIndex === index ? 'Correct answer' : 'Click to mark as correct'}
            >
              <input
                type="radio"
                name="correct-answer"
                checked={correctIndex === index}
                onChange={() => onUpdateCorrectIndex(index)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="text-sm font-bold">{OPTION_LABELS[index]}</span>
            </label>

            {/* Option text input */}
            <input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder={`Option ${OPTION_LABELS[index]}`}
              disabled={disabled}
              className={`
                flex-1 px-3 py-2 min-h-[var(--size-touch)] text-base rounded-lg border border-border
                bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-label={`Option ${OPTION_LABELS[index]}`}
            />

            {/* Remove option button (only if more than 2 options) */}
            {options.length > 2 && !disabled && (
              <button
                type="button"
                onClick={() => handleRemoveOption(index)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                aria-label={`Remove option ${OPTION_LABELS[index]}`}
                title="Remove option"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Click the letter button to mark the correct answer. Green = correct.
      </p>
    </div>
  );
}

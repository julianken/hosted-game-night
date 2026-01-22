'use client';

import { useState, useId } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useGameStore } from '@/stores/game-store';
import { useToast } from '@/components/ui/Toast';
import type { Question } from '@/types';
import type { TriviaQuestion } from '@beak-gaming/database/types';

export interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Convert app Question to database TriviaQuestion format
 */
function convertQuestionToDb(question: Question): TriviaQuestion {
  // Find the index of the correct answer in the options array
  const correctAnswer = question.correctAnswers[0];
  const correctIndex = question.options.indexOf(correctAnswer);

  return {
    question: question.text,
    options: question.optionTexts,
    correctIndex,
    category: question.category,
  };
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  onSuccess,
}: SaveTemplateModalProps) {
  const nameId = useId();
  const defaultId = useId();
  const { success, error: errorToast } = useToast();

  // Get current game state from store
  const questions = useGameStore((state) => state.questions);
  const settings = useGameStore((state) => state.settings);

  // Form state
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (questions.length === 0) {
      setError('No questions to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert questions to database format
      const dbQuestions = questions.map(convertQuestionToDb);

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          questions: dbQuestions,
          rounds_count: settings.roundsCount,
          questions_per_round: settings.questionsPerRound,
          timer_duration: settings.timerDuration,
          is_default: isDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      success(`Template "${name.trim()}" saved successfully`);

      // Reset form
      setName('');
      setIsDefault(false);

      // Notify parent
      onSuccess?.();

      // Close modal
      onClose();
    } catch (err) {
      console.error('Error saving template:', err);
      const message = err instanceof Error ? err.message : 'Failed to save template';
      setError(message);
      errorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setIsDefault(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save Question Set"
      confirmLabel={isSaving ? 'Saving...' : 'Save'}
      cancelLabel="Cancel"
      onConfirm={handleSave}
      variant="default"
      showFooter
    >
      <div className="flex flex-col gap-6">
        {/* Template Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-lg font-medium">
            Template Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            placeholder="e.g., General Knowledge - Round 1"
            maxLength={100}
            className={`
              min-h-[56px] px-4 py-3
              text-lg rounded-lg
              bg-background border-2 border-border
              focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-muted-foreground
            `}
            aria-describedby={error ? `${nameId}-error` : undefined}
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        {/* Current Settings Preview */}
        <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-base font-semibold text-muted-foreground">
            Question Set Details
          </h3>
          <ul className="text-base space-y-1">
            <li>
              <span className="font-medium">Questions:</span> {questions.length}
            </li>
            <li>
              <span className="font-medium">Rounds:</span> {settings.roundsCount}
            </li>
            <li>
              <span className="font-medium">Questions per Round:</span> {settings.questionsPerRound}
            </li>
            <li>
              <span className="font-medium">Timer:</span> {settings.timerDuration}s
            </li>
          </ul>
        </div>

        {/* Set as Default Checkbox */}
        <div className="flex items-center gap-3">
          <input
            id={defaultId}
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={isSaving}
            className={`
              w-6 h-6
              rounded border-2 border-border
              text-primary focus:ring-4 focus:ring-primary/50
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer
            `}
          />
          <label
            htmlFor={defaultId}
            className={`text-lg font-medium ${isSaving ? 'opacity-50' : 'cursor-pointer'}`}
          >
            Set as default template
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div
            id={`${nameId}-error`}
            role="alert"
            className="p-4 bg-destructive/10 border border-destructive rounded-lg"
          >
            <p className="text-base text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

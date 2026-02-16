'use client';

import { useState, useId, useMemo } from 'react';
import { Modal } from "@beak-gaming/ui";
import { useGameStore } from '@/stores/game-store';
import { useToast } from "@beak-gaming/ui";
import { questionsToTriviaQuestions } from '@/lib/questions/conversion';

export interface SaveQuestionSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Captures questions only (converts to TriviaQuestion[]) and posts to /api/question-sets.
 * Preview shows question count and category breakdown.
 */
export function SaveQuestionSetModal({
  isOpen,
  onClose,
  onSuccess,
}: SaveQuestionSetModalProps) {
  const nameId = useId();
  const defaultId = useId();
  const descriptionId = useId();
  const { success, error: errorToast } = useToast();

  const questions = useGameStore((state) => state.questions);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      const cat = q.category || 'general_knowledge';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [questions]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Question set name is required');
      return;
    }

    if (questions.length === 0) {
      setError('No questions to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const dbQuestions = questionsToTriviaQuestions(questions);

      const response = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          questions: dbQuestions,
          is_default: isDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save question set');
      }

      success(`Question set "${name.trim()}" saved successfully`);
      setName('');
      setDescription('');
      setIsDefault(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving question set:', err);
      const message = err instanceof Error ? err.message : 'Failed to save question set';
      setError(message);
      errorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setDescription('');
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
        {/* Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-lg font-medium">
            Question Set Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            placeholder="e.g., General Knowledge - Set 1"
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

        {/* Description Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor={descriptionId} className="text-lg font-medium">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            placeholder="Brief description of this question set..."
            maxLength={500}
            rows={2}
            className={`
              min-h-[56px] px-4 py-3
              text-lg rounded-lg
              bg-background border-2 border-border
              focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-muted-foreground
              resize-none
            `}
          />
        </div>

        {/* Question Set Preview */}
        <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-base font-semibold text-muted-foreground">
            Question Set Details
          </h3>
          <ul className="text-base space-y-1">
            <li>
              <span className="font-medium">Total Questions:</span> {questions.length}
            </li>
            {categoryBreakdown.length > 0 && (
              <li>
                <span className="font-medium">Categories:</span>
                <ul className="ml-4 mt-1 space-y-0.5">
                  {categoryBreakdown.map(([category, count]) => (
                    <li key={category} className="text-base text-muted-foreground">
                      {category.replace(/_/g, ' ')} ({count})
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </div>

        {/* Set as Default */}
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
            Set as default question set
          </label>
        </div>

        {/* Error */}
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

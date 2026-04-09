'use client';

import { useState, useId } from 'react';
import { Modal } from "@joolie-boolie/ui";
import { useGameStore } from '@/stores/game-store';
import { useTriviaPresetStore } from '@/stores/preset-store';
import { useToast } from "@joolie-boolie/ui";

export interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Captures settings only (roundsCount, questionsPerRound, timerDuration)
 * and posts to /api/presets.
 */
export function SavePresetModal({
  isOpen,
  onClose,
  onSuccess,
}: SavePresetModalProps) {
  const nameId = useId();
  const defaultId = useId();
  const { success, error: errorToast } = useToast();

  const settings = useGameStore((state) => state.settings);

  // Preset store actions
  const createPreset = useTriviaPresetStore((state) => state.create);

  // Form state
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Preset name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      createPreset({
        name: name.trim(),
        rounds_count: settings.roundsCount,
        questions_per_round: settings.questionsPerRound,
        timer_duration: settings.timerDuration,
        is_default: isDefault,
      });

      success(`Preset "${name.trim()}" saved successfully`);
      setName('');
      setIsDefault(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving preset:', err);
      const message = err instanceof Error ? err.message : 'Failed to save preset';
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
      title="Save Settings Preset"
      confirmLabel={isSaving ? 'Saving...' : 'Save'}
      cancelLabel="Cancel"
      onConfirm={handleSave}
      variant="default"
      showFooter
    >
      <div className="flex flex-col gap-6">
        {/* Preset Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-lg font-medium">
            Preset Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            placeholder="e.g., Quick Game, Full Evening"
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

        {/* Settings Preview */}
        <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-base font-semibold text-muted-foreground">
            Settings to Save
          </h3>
          <ul className="text-base space-y-1">
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
            Set as default preset
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

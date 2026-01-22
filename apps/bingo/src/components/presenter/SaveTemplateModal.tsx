'use client';

import { useState, useId } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useGameStore } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { useToast } from '@/components/ui/Toast';

export interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  onSuccess,
}: SaveTemplateModalProps) {
  const nameId = useId();
  const defaultId = useId();
  const { success, error: errorToast } = useToast();

  // Get current settings from stores
  const pattern = useGameStore((state) => state.pattern);
  const autoCallEnabled = useGameStore((state) => state.autoCallEnabled);
  const autoCallSpeed = useGameStore((state) => state.autoCallSpeed);
  const voicePack = useAudioStore((state) => state.voicePack);

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

    if (!pattern) {
      setError('No pattern selected');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          pattern_id: pattern.id,
          voice_pack: voicePack,
          auto_call_enabled: autoCallEnabled,
          auto_call_interval: autoCallSpeed,
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
      title="Save Template"
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
            placeholder="e.g., Standard Game"
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
            Current Settings
          </h3>
          <ul className="text-base space-y-1">
            <li>
              <span className="font-medium">Pattern:</span> {pattern?.name || 'None'}
            </li>
            <li>
              <span className="font-medium">Voice Pack:</span> {voicePack}
            </li>
            <li>
              <span className="font-medium">Auto-Call:</span>{' '}
              {autoCallEnabled ? `On (${autoCallSpeed / 1000}s)` : 'Off'}
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

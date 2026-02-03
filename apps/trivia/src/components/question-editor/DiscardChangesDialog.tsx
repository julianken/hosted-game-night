'use client';

import { Modal } from '@beak-gaming/ui';

export interface DiscardChangesDialogProps {
  isOpen: boolean;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

/**
 * Confirmation dialog shown when user tries to close modal with unsaved changes.
 */
export function DiscardChangesDialog({
  isOpen,
  onDiscard,
  onKeepEditing,
}: DiscardChangesDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onKeepEditing}
      title="Discard Changes?"
      confirmLabel="Discard Changes"
      cancelLabel="Keep Editing"
      onConfirm={onDiscard}
      variant="danger"
      showFooter
    >
      <div className="flex flex-col gap-4">
        <p className="text-lg">
          You have unsaved changes. Are you sure you want to discard them?
        </p>
      </div>
    </Modal>
  );
}

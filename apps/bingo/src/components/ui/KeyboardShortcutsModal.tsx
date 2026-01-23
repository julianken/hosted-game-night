'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@beak-gaming/ui';

export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

const defaultShortcuts: KeyboardShortcut[] = [
  { key: 'Space', label: 'Space', description: 'Roll / Call next ball' },
  { key: 'P', label: 'P', description: 'Pause / Resume game' },
  { key: 'R', label: 'R', description: 'Reset game' },
  { key: 'U', label: 'U', description: 'Undo last call' },
  { key: 'M', label: 'M', description: 'Mute / Unmute audio' },
  { key: 'F', label: 'F', description: 'Toggle fullscreen' },
  { key: '?', label: '?', description: 'Show this help' },
];

/**
 * Accessible modal displaying keyboard shortcuts.
 * Follows WAI-ARIA dialog pattern with focus trapping.
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management: focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }

      // Focus trap: cycle through focusable elements
      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="keyboard-shortcuts-title"
            className="text-2xl font-bold text-foreground"
          >
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4">
          <ul className="space-y-3" role="list">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.key}
                className="flex items-center justify-between py-2"
              >
                <span className="text-lg text-foreground">
                  {shortcut.description}
                </span>
                <kbd className="min-w-[48px] px-3 py-1.5 bg-muted/30 border border-border rounded-lg font-mono text-base text-center">
                  {shortcut.label}
                </kbd>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { ReactNode, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: 'default' | 'danger';
  showFooter?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  showFooter = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  }, []);

  // Focus trap implementation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [getFocusableElements, onClose]
  );

  // Store previously focused element and focus modal on open
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      // Focus the modal container after a short delay to allow render
      setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current?.focus();
        }
      }, 0);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
      if (previouslyFocusedElement.current && !isOpen) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, getFocusableElements]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        p-4
      "
      onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="
          relative z-10
          w-full max-w-lg
          bg-background rounded-xl
          shadow-2xl
          border-2 border-border
          outline-none
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2
            id="modal-title"
            className="text-2xl font-bold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="
              min-h-[44px] min-w-[44px]
              flex items-center justify-center
              rounded-lg
              text-muted hover:text-foreground
              hover:bg-muted/20
              transition-colors
              focus:outline-none focus:ring-4 focus:ring-primary/50
            "
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

        {/* Body */}
        <div className="p-6 text-lg">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
            {onConfirm && (
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={onConfirm}
                className="flex-1"
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at document root
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

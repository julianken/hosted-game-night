'use client';

import {
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

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
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeMaxWidth: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  full: 'max-w-[calc(100vw-2rem)]',
};

type AnimState = 'entering' | 'visible' | 'exiting' | 'hidden';

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
  size = 'md',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const [animState, setAnimState] = useState<AnimState>('hidden');

  // Animation state machine:
  // isOpen=true  -> entering -> visible
  // isOpen=false -> exiting  -> hidden (after 200ms)
  useEffect(() => {
    if (isOpen) {
      setAnimState('entering');
      const t = setTimeout(() => setAnimState('visible'), 10);
      return () => clearTimeout(t);
    } else {
      if (animState === 'visible' || animState === 'entering') {
        setAnimState('exiting');
        const t = setTimeout(() => setAnimState('hidden'), 200);
        return () => clearTimeout(t);
      }
    }
  }, [isOpen]);

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

      setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current?.focus();
        }
      }, 0);

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

  if (animState === 'hidden') return null;

  // Animation styles based on state
  const isEnter = animState === 'entering';
  const isExit = animState === 'exiting';

  const backdropStyle: React.CSSProperties = {
    opacity: isEnter ? 0 : isExit ? 0 : 1,
    transition: isExit
      ? 'opacity 200ms ease-out'
      : 'opacity 200ms ease-out',
  };

  const contentStyle: React.CSSProperties = {
    opacity: isEnter ? 0 : isExit ? 0 : 1,
    transform: isEnter
      ? 'scale(0.95) translateY(4px)'
      : isExit
        ? 'scale(0.98) translateY(2px)'
        : 'scale(1) translateY(0)',
    transition: isExit
      ? 'opacity 200ms ease-out, transform 200ms ease-out'
      : 'opacity 250ms cubic-bezier(0, 0, 0.2, 1), transform 300ms cubic-bezier(0.42, 0, 0.2, 1)',
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[50] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler}
    >
      {/* Backdrop: --overlay color with backdrop blur */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          background: 'var(--overlay)',
          ...backdropStyle,
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={[
          'relative z-10',
          'w-full',
          sizeMaxWidth[size],
          'max-h-[90vh]',
          'flex flex-col',
          'bg-surface-elevated',
          // Border: 1px border-border-strong per spec (section 3.4)
          'border border-border-strong',
          'rounded-[var(--radius-xl)]',
          'shadow-xl',
          'outline-none',
        ].join(' ')}
        style={contentStyle}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
          <h2
            id="modal-title"
            className="text-xl font-bold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={[
              'min-h-[44px] min-w-[44px]',
              'flex items-center justify-center',
              'rounded-lg',
              'text-foreground-muted hover:text-foreground',
              'hover:bg-surface-hover',
              'transition-colors',
              'focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--ring)]',
            ].join(' ')}
          >
            <svg
              className="w-5 h-5"
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
        <div className="flex-1 overflow-y-auto p-6 text-base text-foreground">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

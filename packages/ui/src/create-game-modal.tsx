'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Button } from './button';

export interface CreateGameModalProps {
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;

  /**
   * Callback to close the modal
   */
  onClose: () => void;

  /**
   * Callback when the form is submitted with a valid PIN
   * @param pin - The validated PIN (4-6 digits)
   */
  onSubmit: (pin: string) => Promise<void>;

  /**
   * Whether the submit action is currently in progress
   */
  isLoading?: boolean;

  /**
   * Server-side error message to display
   */
  error?: string;
}

/**
 * PIN validation rules
 */
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;
const PIN_PATTERN = /^\d+$/;

/**
 * Validates a PIN string
 * @param pin - The PIN to validate
 * @returns Error message if invalid, null if valid
 */
function validatePin(pin: string): string | null {
  if (!pin) {
    return 'PIN is required';
  }

  if (!PIN_PATTERN.test(pin)) {
    return 'PIN must contain only digits';
  }

  if (pin.length < PIN_MIN_LENGTH) {
    return `PIN must be at least ${PIN_MIN_LENGTH} digits`;
  }

  if (pin.length > PIN_MAX_LENGTH) {
    return `PIN must be no more than ${PIN_MAX_LENGTH} digits`;
  }

  return null;
}

/**
 * Modal component for creating a new game session with PIN protection.
 *
 * Features:
 * - PIN input (4-6 digits)
 * - Confirmation field to prevent typos
 * - Client-side validation with helpful error messages
 * - Loading state during submission
 * - Server error display
 * - Senior-friendly design (large fonts, high contrast, 44x44px touch targets)
 * - Full accessibility (ARIA labels, focus management, keyboard navigation)
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [isLoading, setIsLoading] = useState(false);
 * const [error, setError] = useState<string>();
 *
 * const handleSubmit = async (pin: string) => {
 *   setIsLoading(true);
 *   try {
 *     await createGameSession(pin);
 *     setIsOpen(false);
 *   } catch (err) {
 *     setError(err.message);
 *   } finally {
 *     setIsLoading(false);
 *   }
 * };
 *
 * return (
 *   <CreateGameModal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     onSubmit={handleSubmit}
 *     isLoading={isLoading}
 *     error={error}
 *   />
 * );
 * ```
 */
export function CreateGameModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error: serverError,
}: CreateGameModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setConfirmPin('');
      setPinError(undefined);
      setConfirmError(undefined);
    }
  }, [isOpen]);

  // Clear server error when user starts typing
  useEffect(() => {
    if (serverError && (pin || confirmPin)) {
      // Server errors are managed by parent, don't clear them here
    }
  }, [pin, confirmPin, serverError]);

  /**
   * Validates PIN field on blur
   */
  const handlePinBlur = () => {
    const error = validatePin(pin);
    setPinError(error ?? undefined);
  };

  /**
   * Validates confirmation field on blur
   */
  const handleConfirmBlur = () => {
    if (!confirmPin) {
      setConfirmError('Please confirm your PIN');
      return;
    }

    if (pin !== confirmPin) {
      setConfirmError('PINs do not match');
      return;
    }

    setConfirmError(undefined);
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate PIN
    const pinValidationError = validatePin(pin);
    if (pinValidationError) {
      setPinError(pinValidationError);
      return;
    }
    setPinError(undefined);

    // Validate confirmation
    if (!confirmPin) {
      setConfirmError('Please confirm your PIN');
      return;
    }

    if (pin !== confirmPin) {
      setConfirmError('PINs do not match');
      return;
    }
    setConfirmError(undefined);

    // Submit if all validations pass
    await onSubmit(pin);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Game" showFooter={false}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Introduction */}
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Set a PIN to protect presenter controls. The audience won't need this.
        </p>

        {/* PIN Input */}
        <Input
          type="password"
          label={`Enter PIN (${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits)`}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setPinError(undefined);
          }}
          onBlur={handlePinBlur}
          maxLength={PIN_MAX_LENGTH}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="new-password"
          required
          disabled={isLoading}
          error={pinError}
          aria-label="Enter your PIN"
        />

        {/* Confirm PIN Input */}
        <Input
          type="password"
          label="Confirm PIN"
          value={confirmPin}
          onChange={(e) => {
            setConfirmPin(e.target.value);
            setConfirmError(undefined);
          }}
          onBlur={handleConfirmBlur}
          maxLength={PIN_MAX_LENGTH}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="new-password"
          required
          disabled={isLoading}
          error={confirmError}
          aria-label="Confirm your PIN"
        />

        {/* Help Text */}
        <div
          className="
            bg-blue-50 dark:bg-blue-900/30
            border-l-4 border-blue-500
            p-4 rounded-r-lg
          "
          role="note"
          aria-label="Helpful tip"
        >
          <p className="text-base text-blue-900 dark:text-blue-100">
            <span className="font-semibold" aria-hidden="true">💡 Tip: </span>
            Choose a PIN you'll remember for rejoining later.
          </p>
        </div>

        {/* Server Error Display */}
        {serverError && (
          <div
            className="
              bg-red-50 dark:bg-red-900/30
              border-l-4 border-red-500
              p-4 rounded-r-lg
            "
            role="alert"
            aria-live="polite"
          >
            <p className="text-base text-red-900 dark:text-red-100">
              {serverError}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Cancel and close modal"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            disabled={isLoading}
            aria-label={isLoading ? 'Creating game session' : 'Create game session'}
          >
            {isLoading ? 'Creating...' : 'Create Game'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

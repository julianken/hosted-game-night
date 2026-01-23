'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Button } from './button';

export interface JoinGameModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  remainingAttempts?: number;
}

export function JoinGameModal({
  roomCode,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
  remainingAttempts,
}: JoinGameModalProps) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string>('');

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits, max 6 characters
    if (/^\d*$/.test(value) && value.length <= 6) {
      setPin(value);
      setLocalError('');
    }
  };

  const handleSubmit = async () => {
    // Validate PIN
    if (!pin) {
      setLocalError('Please enter a PIN');
      return;
    }

    if (pin.length < 4) {
      setLocalError('PIN must be at least 4 digits');
      return;
    }

    try {
      await onSubmit(pin);
      // On success, parent component will handle closing modal and navigation
    } catch (err) {
      // Error will be passed via error prop from parent
      console.error('PIN verification failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && pin) {
      handleSubmit();
    }
  };

  const displayError = error || localError;
  const showAttemptsWarning =
    remainingAttempts !== undefined && remainingAttempts < 5;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Join Game ${roomCode}`}
      showFooter={false}
    >
      <div className="space-y-6">
        <p className="text-lg text-foreground">
          Enter the presenter PIN to control this game.
        </p>

        <Input
          type="password"
          label="Presenter PIN"
          value={pin}
          onChange={handlePinChange}
          onKeyDown={handleKeyDown}
          maxLength={6}
          placeholder="Enter 4-6 digits"
          autoFocus
          disabled={isLoading}
          error={displayError}
          aria-label="Presenter PIN"
        />

        {showAttemptsWarning && !displayError && (
          <div
            className="p-4 bg-warning/10 border-2 border-warning rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-warning flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <p className="text-base text-foreground font-semibold">
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''}{' '}
                remaining
              </p>
            </div>
          </div>
        )}

        <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
          <p className="text-base text-foreground">
            <strong>Audience members:</strong> You don't need a PIN. Just open
            the display page to view the game.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            size="lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !pin}
            loading={isLoading}
            size="lg"
          >
            Join as Presenter
          </Button>
        </div>
      </div>
    </Modal>
  );
}

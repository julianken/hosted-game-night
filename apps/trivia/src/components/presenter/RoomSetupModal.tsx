'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Modal, Input, Button } from '@beak-gaming/ui';

export interface RoomSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string, pin: string) => void;
  onPlayOffline: () => void;
  error?: string | null;
}

export function RoomSetupModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onPlayOffline,
  error,
}: RoomSetupModalProps) {
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomCodeError, setRoomCodeError] = useState('');
  const [pinError, setPinError] = useState('');

  // Reset state when modal closes
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isOpen) {
      setJoinRoomCode('');
      setJoinPin('');
      setShowJoinForm(false);
      setRoomCodeError('');
      setPinError('');
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate room code: must not be empty
    if (!joinRoomCode.trim()) {
      setRoomCodeError('Room code is required');
      return;
    }

    // Validate PIN: must be exactly 4 digits
    if (!/^\d{4}$/.test(joinPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    setRoomCodeError('');
    setPinError('');
    onJoinRoom(joinRoomCode.trim().toUpperCase(), joinPin);
  };

  const handleRoomCodeChange = (value: string) => {
    // Convert to uppercase and remove non-alphanumeric chars except hyphen
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setJoinRoomCode(cleaned);
    if (roomCodeError) {
      setRoomCodeError('');
    }
  };

  const handleJoinPinChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setJoinPin(cleaned);
    if (pinError) {
      setPinError('');
    }
  };

  const toggleJoinForm = () => {
    setShowJoinForm(!showJoinForm);
    setRoomCodeError('');
    setPinError('');
    setJoinRoomCode('');
    setJoinPin('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Room Setup"
    >
      <div className="flex flex-col gap-6">
        {/* Error message display */}
        {error && (
          <div
            className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <svg
                className="flex-shrink-0 w-6 h-6 text-destructive mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-destructive mb-1">Error</h4>
                <p className="text-base text-destructive/90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create New Game Option */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg"
              aria-hidden="true"
            >
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">Create New Game</h3>
              <p className="text-base text-muted">
                Start a new trivia session and share with players
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={onCreateRoom}
            className="w-full"
            aria-label="Create a new game room"
          >
            Create New Game
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Join Existing Game Option */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-accent/10 rounded-lg"
              aria-hidden="true"
            >
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">Join Existing Game</h3>
              <p className="text-base text-muted">
                Enter room code and PIN to join a game in progress
              </p>
            </div>
          </div>

          {showJoinForm ? (
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <Input
                type="text"
                value={joinRoomCode}
                onChange={(e) => handleRoomCodeChange(e.target.value)}
                placeholder="e.g., SWAN-42"
                error={roomCodeError}
                label="Room Code"
                autoFocus
                aria-label="Enter room code"
                aria-describedby="room-code-help"
              />
              <p id="room-code-help" className="text-base text-muted-foreground sr-only">
                Enter the room code displayed on the host's screen
              </p>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={joinPin}
                onChange={(e) => handleJoinPinChange(e.target.value)}
                placeholder="Enter 4-digit PIN"
                error={pinError}
                label="Room PIN"
                aria-label="Enter room PIN"
                aria-describedby="pin-help"
              />
              <p id="pin-help" className="text-base text-muted-foreground sr-only">
                Enter the 4-digit PIN code provided by the game host
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={toggleJoinForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!joinRoomCode.trim() || joinPin.length !== 4}
                  className="flex-1"
                >
                  Join Game
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={toggleJoinForm}
              className="w-full"
              aria-label="Show form to join existing game"
            >
              Join with Room Code
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Play Offline Option */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-secondary/10 rounded-lg"
              aria-hidden="true"
            >
              <svg
                className="w-8 h-8 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">Play Offline</h3>
              <p className="text-base text-muted">
                Play without internet connection or room sharing
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={onPlayOffline}
            className="w-full"
            aria-label="Play offline without network connection"
          >
            Play Offline
          </Button>
        </div>
      </div>
    </Modal>
  );
}

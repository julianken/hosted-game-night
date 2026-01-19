'use client';

import { Button } from '@/components/ui/Button';
import { GameStatus } from '@/types';

export interface ControlPanelProps {
  status: GameStatus;
  canCall: boolean;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canUndo: boolean;
  onStart: () => void;
  onCallBall: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onUndo: () => void;
}

export function ControlPanel({
  status,
  canCall,
  canStart,
  canPause,
  canResume,
  canUndo,
  onStart,
  onCallBall,
  onPause,
  onResume,
  onReset,
  onUndo,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Main action button */}
      <div className="flex flex-col gap-2">
        {status === 'idle' && (
          <Button
            variant="primary"
            size="lg"
            onClick={onStart}
            disabled={!canStart}
            className="w-full"
          >
            Start Game
          </Button>
        )}

        {(status === 'playing' || status === 'paused') && (
          <Button
            variant="primary"
            size="lg"
            onClick={onCallBall}
            disabled={!canCall}
            className="w-full"
          >
            Roll
            <span className="ml-2 text-base opacity-75">[Space]</span>
          </Button>
        )}
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-2 gap-2">
        {canPause && (
          <Button variant="secondary" size="md" onClick={onPause}>
            Pause
            <span className="ml-1 text-sm opacity-75">[P]</span>
          </Button>
        )}

        {canResume && (
          <Button variant="primary" size="md" onClick={onResume}>
            Resume
            <span className="ml-1 text-sm opacity-75">[P]</span>
          </Button>
        )}

        <Button
          variant="secondary"
          size="md"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
          <span className="ml-1 text-sm opacity-75">[U]</span>
        </Button>

        <Button variant="danger" size="md" onClick={onReset}>
          Reset
          <span className="ml-1 text-sm opacity-75">[R]</span>
        </Button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span
          className={`
            w-3 h-3 rounded-full
            ${status === 'playing' ? 'bg-success animate-pulse' : ''}
            ${status === 'paused' ? 'bg-warning' : ''}
            ${status === 'idle' ? 'bg-muted' : ''}
            ${status === 'ended' ? 'bg-error' : ''}
          `}
        />
        <span className="text-lg font-medium capitalize">{status}</span>
      </div>
    </div>
  );
}

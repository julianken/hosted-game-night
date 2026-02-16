'use client';

import { useState } from 'react';
import { Button } from "@beak-gaming/ui";
import { GameStatus } from '@/types';
import { SaveTemplateModal } from './SaveTemplateModal';

export interface ControlPanelProps {
  isProcessing?: boolean;
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
  isProcessing,
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
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4" role="group" aria-label="Game controls">
        {/* Main action button */}
        <div className="flex flex-col gap-2" role="group" aria-label="Primary actions">
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
            disabled={!canCall || isProcessing}
            data-processing={isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Calling...' : 'Roll'}
            <span className="ml-2 text-base opacity-75">[Space]</span>
          </Button>
        )}
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Secondary controls">
        {canPause && (
          <Button variant="secondary" size="md" onClick={onPause}>
            Pause
            <span className="ml-1 text-base opacity-75">[P]</span>
          </Button>
        )}

        {canResume && (
          <Button variant="primary" size="md" onClick={onResume}>
            Resume
            <span className="ml-1 text-base opacity-75">[P]</span>
          </Button>
        )}

        <Button
          variant="secondary"
          size="md"
          onClick={onUndo}
          disabled={!canUndo || isProcessing}
        >
          Undo
          <span className="ml-1 text-base opacity-75">[U]</span>
        </Button>

        <Button variant="danger" size="md" onClick={onReset}>
          Reset
          <span className="ml-1 text-base opacity-75">[R]</span>
        </Button>
      </div>

      {/* Save as Template button */}
      <Button
        variant="secondary"
        size="md"
        onClick={() => setShowSaveTemplateModal(true)}
        className="w-full"
        aria-label="Save current settings as a template"
      >
        Save as Template
      </Button>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 py-2" role="status" aria-live="polite" aria-label={`Game status: ${status}`}>
        <span
          aria-hidden="true"
          className={`
            w-3 h-3 rounded-full
            ${status === 'playing' ? 'bg-success animate-pulse motion-reduce:animate-none' : ''}
            ${status === 'paused' ? 'bg-warning' : ''}
            ${status === 'idle' ? 'bg-muted' : ''}
            ${status === 'ended' ? 'bg-error' : ''}
          `}
        />
        <span className="text-lg font-medium capitalize">{status}</span>
      </div>
    </div>

    {/* Save Template Modal */}
    <SaveTemplateModal
      isOpen={showSaveTemplateModal}
      onClose={() => setShowSaveTemplateModal(false)}
    />
  </>
  );
}

'use client';

import { useId, useState, useCallback } from 'react';
import { RevealChimeType, REVEAL_CHIME_OPTIONS } from '@/types';
import { Button } from "@beak-gaming/ui";
import { Slider } from '@beak-gaming/ui';
import { useAudioStore } from '@/stores/audio-store';

export interface RevealChimeSelectorProps {
  disabled?: boolean;
}

const REVEAL_CHIME_TYPES = Object.entries(REVEAL_CHIME_OPTIONS).map(([id, config]) => ({
  id: id as RevealChimeType,
  name: config.name,
}));

export function RevealChimeSelector({ disabled = false }: RevealChimeSelectorProps) {
  const selectId = useId();
  const [isPlaying, setIsPlaying] = useState(false);

  const revealChime = useAudioStore((state) => state.revealChime);
  const chimeVolume = useAudioStore((state) => state.chimeVolume);
  const setChimeVolume = useAudioStore((state) => state.setChimeVolume);
  const setRevealChime = useAudioStore((state) => state.setRevealChime);

  // Convert 0-1 to 0-100 for display
  const volumePercent = Math.round(chimeVolume * 100);

  // Handle volume slider changes - convert 0-100 back to 0-1
  const handleVolumeChange = useCallback(
    (value: number) => {
      setChimeVolume(value / 100);
    },
    [setChimeVolume]
  );

  // Handle chime change
  const handleChimeChange = useCallback(
    (newChime: RevealChimeType) => {
      setRevealChime(newChime);
    },
    [setRevealChime]
  );

  // Play preview of current selection
  const playPreview = useCallback(async () => {
    if (isPlaying || revealChime === 'none' || typeof Audio === 'undefined') return;

    setIsPlaying(true);

    try {
      const soundFile = `/audio/sfx/chimes/${revealChime}.mp3`;

      const audio = new Audio(soundFile);
      audio.volume = chimeVolume;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          audio.src = '';
          resolve();
        };
        audio.onerror = () => {
          audio.src = '';
          resolve();
        };
        audio.play().catch(() => {
          audio.src = '';
          resolve();
        });
      });
    } finally {
      setIsPlaying(false);
    }
  }, [isPlaying, revealChime, chimeVolume]);

  const selectClassName = `
    w-full h-[44px] px-4 text-lg
    bg-background border-2 border-border rounded-lg
    cursor-pointer appearance-none
    focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
    disabled:opacity-50 disabled:cursor-not-allowed
    ${disabled ? '' : 'hover:border-primary/50'}
  `;

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '20px',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Reveal Chime</h3>

      <div className="space-y-2">
        <label
          htmlFor={selectId}
          className={`
            block text-base font-medium
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          Sound
        </label>
        <select
          id={selectId}
          value={revealChime}
          onChange={(e) => handleChimeChange(e.target.value as RevealChimeType)}
          disabled={disabled}
          className={selectClassName}
          style={selectStyle}
        >
          {REVEAL_CHIME_TYPES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {/* Volume Slider - only show when a chime is selected */}
      {revealChime !== 'none' && (
        <Slider
          value={volumePercent}
          onChange={handleVolumeChange}
          min={0}
          max={100}
          step={5}
          label="Chime Volume"
          unit="%"
          disabled={disabled}
        />
      )}

      {/* Preview Button - only show when a chime is selected */}
      {revealChime !== 'none' && (
        <Button
          onClick={playPreview}
          disabled={disabled || isPlaying}
          variant="secondary"
          size="sm"
          loading={isPlaying}
        >
          {isPlaying ? 'Playing...' : 'Preview Chime'}
        </Button>
      )}
    </div>
  );
}

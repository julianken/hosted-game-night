'use client';

import { useId, useState, useCallback } from 'react';
import { RollSoundType, RollDuration, ROLL_SOUND_OPTIONS } from '@/types';
import { Button } from '@/components/ui/Button';
import { Slider } from '@beak-gaming/ui';
import { useAudioStore } from '@/stores/audio-store';

export interface RollSoundSelectorProps {
  disabled?: boolean;
}

const ROLL_SOUND_TYPES = Object.entries(ROLL_SOUND_OPTIONS).map(([id, config]) => ({
  id: id as RollSoundType,
  name: config.name,
  durations: config.durations,
}));

export function RollSoundSelector({ disabled = false }: RollSoundSelectorProps) {
  const typeId = useId();
  const durationId = useId();
  const [isPlaying, setIsPlaying] = useState(false);

  const rollSoundType = useAudioStore((state) => state.rollSoundType);
  const rollDuration = useAudioStore((state) => state.rollDuration);
  const voicePack = useAudioStore((state) => state.voicePack);
  const rollSoundVolume = useAudioStore((state) => state.rollSoundVolume);
  const setRollSoundVolume = useAudioStore((state) => state.setRollSoundVolume);
  const setRollSound = useAudioStore((state) => state.setRollSound);

  // Convert 0-1 to 0-100 for display
  const volumePercent = Math.round(rollSoundVolume * 100);

  // Handle volume slider changes - convert 0-100 back to 0-1
  const handleVolumeChange = useCallback(
    (value: number) => {
      setRollSoundVolume(value / 100);
    },
    [setRollSoundVolume]
  );

  // Get available durations for current sound type
  const availableDurations = ROLL_SOUND_OPTIONS[rollSoundType].durations;

  // Handle type change - reset duration if not available
  const handleTypeChange = useCallback(
    (newType: RollSoundType) => {
      const newDurations = ROLL_SOUND_OPTIONS[newType].durations;
      const newDuration = newDurations.includes(rollDuration)
        ? rollDuration
        : newDurations[0];
      setRollSound(newType, newDuration);
    },
    [rollDuration, setRollSound]
  );

  // Handle duration change
  const handleDurationChange = useCallback(
    (newDuration: RollDuration) => {
      setRollSound(rollSoundType, newDuration);
    },
    [rollSoundType, setRollSound]
  );

  // Play preview of current selection
  const playPreview = useCallback(async () => {
    if (isPlaying || typeof Audio === 'undefined') return;

    setIsPlaying(true);

    try {
      const isHall = voicePack.endsWith('-hall');
      const suffix = isHall ? '-hall' : '';
      const soundFile = `/audio/sfx/${rollSoundType}/${rollDuration}${suffix}.mp3`;

      const audio = new Audio(soundFile);
      audio.volume = rollSoundVolume;

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
  }, [isPlaying, rollSoundType, rollDuration, voicePack, rollSoundVolume]);

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
      <h3 className="text-lg font-medium">Roll Sound</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Sound Type */}
        <div className="space-y-2">
          <label
            htmlFor={typeId}
            className={`
              block text-base font-medium
              ${disabled ? 'opacity-50' : ''}
            `}
          >
            Type
          </label>
          <select
            id={typeId}
            value={rollSoundType}
            onChange={(e) => handleTypeChange(e.target.value as RollSoundType)}
            disabled={disabled}
            className={selectClassName}
            style={selectStyle}
          >
            {ROLL_SOUND_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label
            htmlFor={durationId}
            className={`
              block text-base font-medium
              ${disabled ? 'opacity-50' : ''}
            `}
          >
            Duration
          </label>
          <select
            id={durationId}
            value={rollDuration}
            onChange={(e) => handleDurationChange(e.target.value as RollDuration)}
            disabled={disabled}
            className={selectClassName}
            style={selectStyle}
          >
            {availableDurations.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Volume Slider */}
      <Slider
        value={volumePercent}
        onChange={handleVolumeChange}
        min={0}
        max={100}
        step={5}
        label="Volume"
        unit="%"
        disabled={disabled}
      />

      {/* Preview Button */}
      <Button
        onClick={playPreview}
        disabled={disabled || isPlaying}
        variant="secondary"
        size="sm"
        loading={isPlaying}
      >
        {isPlaying ? 'Playing...' : 'Preview Sound'}
      </Button>
    </div>
  );
}

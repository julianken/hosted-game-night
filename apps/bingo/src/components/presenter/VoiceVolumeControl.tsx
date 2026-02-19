'use client';

import { useState, useCallback } from 'react';
import { Button } from '@joolie-boolie/ui';
import { Slider } from '@joolie-boolie/ui';
import { useAudioStore } from '@/stores/audio-store';
import { BingoBall, BingoColumn, BallNumber, COLUMNS, COLUMN_RANGES } from '@/types';

export interface VoiceVolumeControlProps {
  volume: number; // 0-1
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
}

function randomBall(): BingoBall {
  const num = (Math.floor(Math.random() * 75) + 1) as BallNumber;
  let column: BingoColumn = 'B';
  for (const col of COLUMNS) {
    const [min, max] = COLUMN_RANGES[col];
    if (num >= min && num <= max) {
      column = col;
      break;
    }
  }
  return { column, number: num, label: `${column}-${num}` };
}

export function VoiceVolumeControl({ volume, onVolumeChange, disabled = false }: VoiceVolumeControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playBallVoice = useAudioStore((s) => s.playBallVoice);

  const volumePercent = Math.round(volume * 100);

  const handleVolumeChange = useCallback(
    (value: number) => {
      onVolumeChange(value / 100);
    },
    [onVolumeChange]
  );

  const playPreview = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playBallVoice(randomBall());
    } finally {
      setIsPlaying(false);
    }
  }, [isPlaying, playBallVoice]);

  return (
    <div className="space-y-4">
      <Slider
        value={volumePercent}
        onChange={handleVolumeChange}
        min={0}
        max={100}
        step={5}
        label="Voice Volume"
        unit="%"
        disabled={disabled}
      />
      <Button
        onClick={playPreview}
        disabled={disabled || isPlaying}
        variant="secondary"
        size="sm"
        loading={isPlaying}
      >
        {isPlaying ? 'Playing...' : 'Preview Voice'}
      </Button>
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { Slider } from '@beak-gaming/ui';
import { Button } from '@/components/ui/Button';
import { useAudioStore } from '@/stores/audio-store';
import { BingoBall, BingoColumn } from '@/types';

export interface VoiceVolumeControlProps {
  disabled?: boolean;
}

// Generate a random bingo ball for preview
function generateRandomBall(): BingoBall {
  const number = Math.floor(Math.random() * 75) + 1; // 1-75
  let column: BingoColumn;

  if (number <= 15) column = 'B';
  else if (number <= 30) column = 'I';
  else if (number <= 45) column = 'N';
  else if (number <= 60) column = 'G';
  else column = 'O';

  return {
    column,
    number,
    label: `${column}${number}`,
  };
}

export function VoiceVolumeControl({ disabled = false }: VoiceVolumeControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const voiceVolume = useAudioStore((state) => state.voiceVolume);
  const setVoiceVolume = useAudioStore((state) => state.setVoiceVolume);
  const playBallVoice = useAudioStore((state) => state.playBallVoice);

  // Convert 0-1 to 0-100 for display
  const voiceVolumePercent = Math.round(voiceVolume * 100);

  // Handle slider changes - convert 0-100 back to 0-1
  const handleVoiceVolumeChange = useCallback(
    (value: number) => {
      setVoiceVolume(value / 100);
    },
    [setVoiceVolume]
  );

  // Play preview of a random ball voice
  const playPreview = useCallback(async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const ball = generateRandomBall();
      await playBallVoice(ball);
    } finally {
      setIsPlaying(false);
    }
  }, [isPlaying, playBallVoice]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Voice Volume</h3>

      {/* Voice Volume Slider */}
      <Slider
        value={voiceVolumePercent}
        onChange={handleVoiceVolumeChange}
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
        {isPlaying ? 'Playing...' : 'Preview Voice'}
      </Button>
    </div>
  );
}

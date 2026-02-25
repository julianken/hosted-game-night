'use client';

import { useId, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useToast } from "@joolie-boolie/ui";
import type { TriviaPreset } from '@joolie-boolie/database/types';

export interface PresetSelectorProps {
  disabled?: boolean;
  onPresetLoad?: (preset: TriviaPreset) => void;
}

/**
 * Fetches presets from /api/presets and loads ONLY settings
 * (timerDuration, roundsCount, questionsPerRound) into the game store.
 * Does NOT touch questions.
 */
export function PresetSelector({
  disabled = false,
  onPresetLoad,
}: PresetSelectorProps) {
  const id = useId();
  const { success, error: errorToast } = useToast();

  // Store actions
  const updateSettings = useGameStore((state) => state.updateSettings);
  const gameStatus = useGameStore((state) => state.status);

  // Component state
  const [presets, setPresets] = useState<TriviaPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch presets on mount
  useEffect(() => {
    const fetchPresets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/presets');

        if (!response.ok) {
          console.warn('Presets unavailable:', response.status);
          setPresets([]);
          return;
        }

        const data = await response.json();
        setPresets(data.data || []);
      } catch (err) {
        console.error('Error fetching presets:', err);
        setError('Failed to load presets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresets();
  }, []);

  // Load preset settings into store
  const loadPreset = useCallback(async (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);

    if (!preset) {
      errorToast('Preset not found');
      return;
    }

    try {
      updateSettings({
        timerDuration: preset.timer_duration,
        roundsCount: preset.rounds_count,
        questionsPerRound: preset.questions_per_round,
      });

      success(`Loaded preset "${preset.name}"`);
      onPresetLoad?.(preset);
    } catch (err) {
      console.error('Error loading preset:', err);
      errorToast('Failed to apply preset settings');
    }
  }, [presets, updateSettings, success, errorToast, onPresetLoad]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);

    if (presetId) {
      await loadPreset(presetId);
    }
  };

  const isDisabled = disabled || isLoading || gameStatus !== 'setup';

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-lg font-medium ${isDisabled ? 'opacity-50' : ''}`}
      >
        Load Preset
      </label>
      <select
        id={id}
        value={selectedPresetId}
        onChange={handleChange}
        disabled={isDisabled}
        className={`
          min-h-[56px] px-4 py-3
          text-lg rounded-lg
          bg-background border-2 border-border
          focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        `}
      >
        <option value="">
          {isLoading ? 'Loading presets...' : 'Select a preset...'}
        </option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
            {preset.is_default ? ' (Default)' : ''}
            {' '}
            ({preset.rounds_count}R / {preset.questions_per_round}Q / {preset.timer_duration}s)
          </option>
        ))}
      </select>
      {error && (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      )}
      {presets.length === 0 && !isLoading && !error && (
        <p className="text-base text-muted-foreground">
          No saved presets. Save your first preset below.
        </p>
      )}
      {gameStatus !== 'setup' && (
        <p className="text-base text-warning" role="alert">
          Presets can only be loaded during setup.
        </p>
      )}
    </div>
  );
}

'use client';

import { useId } from 'react';
import { VoicePackId } from '@/types';
import { VOICE_PACK_OPTIONS } from '@/stores/audio-store';

export interface VoiceSelectorProps {
  selectedVoice: VoicePackId;
  onSelect: (voice: VoicePackId) => void;
  disabled?: boolean;
  preloadProgress?: number;
}

export function VoiceSelector({
  selectedVoice,
  onSelect,
  disabled = false,
  preloadProgress,
}: VoiceSelectorProps) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={`
          block text-lg font-medium
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        Voice Pack
      </label>
      <select
        id={id}
        value={selectedVoice}
        onChange={(e) => onSelect(e.target.value as VoicePackId)}
        disabled={disabled}
        className={`
          w-full h-[44px] px-4 text-lg
          bg-background border-2 border-border rounded-lg
          cursor-pointer appearance-none
          focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${disabled ? '' : 'hover:border-primary/50'}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '20px',
        }}
      >
        {VOICE_PACK_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      {/* Show selected voice description */}
      <p className="text-base text-muted-foreground">
        {VOICE_PACK_OPTIONS.find((o) => o.id === selectedVoice)?.description}
      </p>

      {/* Show preload progress if loading */}
      {preloadProgress !== undefined && preloadProgress > 0 && preloadProgress < 100 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${preloadProgress}%` }}
            />
          </div>
          <p className="text-base text-muted-foreground">
            Loading voice pack... {preloadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}

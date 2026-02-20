'use client';

/**
 * T4.3: WizardStepSettings
 *
 * Step 2 of the SetupWizard. Handles game settings:
 * preset selection, core settings panel, reveal mode picker,
 * and save-as-preset button.
 */

import { PresetSelector } from '@/components/presenter/PresetSelector';
import { SettingsPanel } from '@/components/presenter/SettingsPanel';
import type { TeamSetup, SettingsState } from '@/stores/settings-store';
import { useGameStore } from '@/stores/game-store';
import type { Team } from '@/types';

export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  timerAutoStart: boolean;
  timerVisible: boolean;
  ttsEnabled: boolean;
  revealMode: 'instant' | 'batch';
  lastTeamSetup: TeamSetup | null;
  currentTeams: Team[];
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onLoadTeams: (teamSetup: TeamSetup) => void;
  onSaveTeams: () => void;
  onSavePreset: () => void;
}

export function WizardStepSettings({
  roundsCount,
  questionsPerRound,
  timerDuration,
  timerAutoStart,
  timerVisible,
  ttsEnabled,
  revealMode,
  lastTeamSetup,
  currentTeams,
  onUpdateSetting,
  onLoadTeams,
  onSaveTeams,
  onSavePreset,
}: WizardStepSettingsProps) {
  const handleRevealModeChange = (mode: 'instant' | 'batch') => {
    onUpdateSetting('revealMode', mode);
    useGameStore.getState().updateRevealMode(mode);
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure rounds, timer, and reveal style
        </p>
      </div>

      {/* Preset Selector */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Load Preset</h3>
        <PresetSelector disabled={false} />
      </div>

      {/* Core Settings Panel */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <SettingsPanel
          status="setup"
          roundsCount={roundsCount}
          questionsPerRound={questionsPerRound}
          timerDuration={timerDuration}
          timerAutoStart={timerAutoStart}
          timerVisible={timerVisible}
          ttsEnabled={ttsEnabled}
          lastTeamSetup={lastTeamSetup}
          currentTeams={currentTeams}
          onUpdateSetting={onUpdateSetting}
          onLoadTeams={onLoadTeams}
          onSaveTeams={onSaveTeams}
        />
      </div>

      {/* Reveal Mode Picker */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Answer Reveal Style</h3>
        <div
          role="radiogroup"
          aria-label="Answer reveal mode"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {/* Batch mode button */}
          <button
            type="button"
            role="radio"
            aria-checked={revealMode === 'batch'}
            onClick={() => handleRevealModeChange('batch')}
            className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 text-left transition-all
              min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50
              ${revealMode === 'batch'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface hover:border-border/80 hover:bg-surface-hover text-foreground'
              }`}
          >
            <span className="text-sm font-semibold leading-tight">
              Batch
            </span>
            <span className="text-xs text-foreground-secondary leading-snug">
              Score all questions, then reveal answers in a ceremony
            </span>
          </button>

          {/* Instant mode button */}
          <button
            type="button"
            role="radio"
            aria-checked={revealMode === 'instant'}
            onClick={() => handleRevealModeChange('instant')}
            className={`flex flex-col gap-1.5 p-4 rounded-xl border-2 text-left transition-all
              min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50
              ${revealMode === 'instant'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface hover:border-border/80 hover:bg-surface-hover text-foreground'
              }`}
          >
            <span className="text-sm font-semibold leading-tight">
              Instant
            </span>
            <span className="text-xs text-foreground-secondary leading-snug">
              Reveal answers one at a time as you go
            </span>
          </button>
        </div>
      </div>

      {/* Save Settings as Preset */}
      <button
        onClick={onSavePreset}
        className="w-full px-4 py-3 rounded-xl text-sm font-medium
          bg-primary hover:bg-primary-hover text-primary-foreground
          transition-colors duration-200 min-h-[44px]"
      >
        Save Settings as Preset
      </button>
    </div>
  );
}

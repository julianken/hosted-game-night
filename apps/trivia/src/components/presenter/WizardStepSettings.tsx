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
import type { Team } from '@/types';

export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  timerAutoStart: boolean;
  timerVisible: boolean;
  ttsEnabled: boolean;
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
  lastTeamSetup,
  currentTeams,
  onUpdateSetting,
  onLoadTeams,
  onSaveTeams,
  onSavePreset,
}: WizardStepSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure rounds and timer
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

      {/* Save Settings as Preset */}
      <button
        type="button"
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

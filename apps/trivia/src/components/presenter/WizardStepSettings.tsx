'use client';

/**
 * T4.3: WizardStepSettings
 *
 * Step 2 of the SetupWizard. Handles game settings:
 * rounds and questions per round configuration.
 */

import { Slider } from '@joolie-boolie/ui';
import { SETTINGS_RANGES } from '@/stores/settings-store';
import type { SettingsState } from '@/stores/settings-store';

export interface WizardStepSettingsProps {
  roundsCount: number;
  questionsPerRound: number;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export function WizardStepSettings({
  roundsCount,
  questionsPerRound,
  onUpdateSetting,
}: WizardStepSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Configure rounds and questions
        </p>
      </div>

      {/* Game Configuration */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-6">
        <Slider
          value={roundsCount}
          onChange={(value) => onUpdateSetting('roundsCount', value)}
          min={SETTINGS_RANGES.roundsCount.min}
          max={SETTINGS_RANGES.roundsCount.max}
          step={1}
          label="Number of Rounds"
        />

        <Slider
          value={questionsPerRound}
          onChange={(value) => onUpdateSetting('questionsPerRound', value)}
          min={SETTINGS_RANGES.questionsPerRound.min}
          max={SETTINGS_RANGES.questionsPerRound.max}
          step={1}
          label="Questions Per Round"
        />
      </div>
    </div>
  );
}

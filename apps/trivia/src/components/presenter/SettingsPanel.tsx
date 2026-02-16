'use client';

import { Toggle, Slider } from '@beak-gaming/ui';
import type { GameStatus, Team } from '@/types';
import type { TeamSetup, SettingsState } from '@/stores/settings-store';
import { SETTINGS_RANGES } from '@/stores/settings-store';

// =============================================================================
// TYPES
// =============================================================================

export interface SettingsPanelProps {
  // Game status - settings are only editable during 'setup'
  status: GameStatus;

  // Numeric settings
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;

  // Boolean settings
  timerAutoStart: boolean;
  timerVisible: boolean;
  ttsEnabled: boolean;

  // Last saved team setup
  lastTeamSetup: TeamSetup | null;

  // Current teams (for save functionality)
  currentTeams: Team[];

  // Callbacks
  onUpdateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => void;
  onLoadTeams: (teamSetup: TeamSetup) => void;
  onSaveTeams: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SettingsPanel({
  status,
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
}: SettingsPanelProps) {
  const isDisabled = status !== 'setup';

  return (
    <div className="space-y-6" role="region" aria-label="Game settings">
      <h2 id="settings-heading" className="text-xl font-semibold">
        Settings
      </h2>

      {/* Game Configuration Section */}
      <section aria-labelledby="game-config-heading">
        <h3
          id="game-config-heading"
          className="text-lg font-medium mb-4 text-foreground"
        >
          Game Configuration
        </h3>

        <div className="space-y-6">
          {/* Rounds Count */}
          <Slider
            value={roundsCount}
            onChange={(value) => onUpdateSetting('roundsCount', value)}
            min={SETTINGS_RANGES.roundsCount.min}
            max={SETTINGS_RANGES.roundsCount.max}
            step={1}
            label="Number of Rounds"
            disabled={isDisabled}
          />

          {/* Questions Per Round */}
          <Slider
            value={questionsPerRound}
            onChange={(value) => onUpdateSetting('questionsPerRound', value)}
            min={SETTINGS_RANGES.questionsPerRound.min}
            max={SETTINGS_RANGES.questionsPerRound.max}
            step={1}
            label="Questions Per Round"
            disabled={isDisabled}
          />
        </div>
      </section>

      {/* Timer Section */}
      <section aria-labelledby="timer-settings-heading">
        <h3
          id="timer-settings-heading"
          className="text-lg font-medium mb-4 text-foreground"
        >
          Timer Settings
        </h3>

        <div className="space-y-6">
          {/* Timer Duration */}
          <Slider
            value={timerDuration}
            onChange={(value) => onUpdateSetting('timerDuration', value)}
            min={SETTINGS_RANGES.timerDuration.min}
            max={SETTINGS_RANGES.timerDuration.max}
            step={5}
            label="Timer Duration"
            unit="s"
            disabled={isDisabled}
          />

          {/* Timer Auto Start */}
          <Toggle
            checked={timerAutoStart}
            onChange={(checked) => onUpdateSetting('timerAutoStart', checked)}
            label="Auto-start Timer"
            disabled={isDisabled}
          />

          {/* Timer Visible */}
          <Toggle
            checked={timerVisible}
            onChange={(checked) => onUpdateSetting('timerVisible', checked)}
            label="Show Timer on Display"
            disabled={isDisabled}
          />
        </div>
      </section>

      {/* Audio Section */}
      <section aria-labelledby="audio-settings-heading">
        <h3
          id="audio-settings-heading"
          className="text-lg font-medium mb-4 text-foreground"
        >
          Audio Settings
        </h3>

        <div className="space-y-6">
          {/* TTS Enabled */}
          <Toggle
            checked={ttsEnabled}
            onChange={(checked) => onUpdateSetting('ttsEnabled', checked)}
            label="Text-to-Speech"
            disabled={isDisabled}
          />
          <p className="text-base text-muted-foreground -mt-4">
            Reads questions aloud when displayed
          </p>
        </div>
      </section>

      {/* Team Setup Section */}
      <section aria-labelledby="team-setup-heading">
        <h3
          id="team-setup-heading"
          className="text-lg font-medium mb-4 text-foreground"
        >
          Team Setup
        </h3>

        <div className="space-y-4">
          {/* Save current teams */}
          {currentTeams.length > 0 && status === 'setup' && (
            <button
              onClick={onSaveTeams}
              className="w-full px-4 py-3 rounded-xl text-base font-medium
                bg-primary hover:bg-primary/90 text-primary-foreground
                transition-colors duration-200
                focus:outline-none focus:ring-4 focus:ring-primary/50"
              aria-label={`Save current ${currentTeams.length} team${currentTeams.length !== 1 ? 's' : ''} for later`}
            >
              Save Current Teams ({currentTeams.length})
            </button>
          )}

          {/* Load saved teams */}
          {lastTeamSetup && lastTeamSetup.count > 0 && status === 'setup' && (
            <div
              className="p-4 bg-muted/20 border border-border rounded-xl space-y-3"
              role="region"
              aria-label="Saved team setup"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Saved Teams</span>
                <span className="text-base text-muted-foreground">
                  {lastTeamSetup.count} team{lastTeamSetup.count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Team names preview */}
              <div className="flex flex-wrap gap-2">
                {lastTeamSetup.names.slice(0, 5).map((name, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-base bg-background border border-border rounded-lg"
                  >
                    {name}
                  </span>
                ))}
                {lastTeamSetup.names.length > 5 && (
                  <span className="px-2 py-1 text-base text-muted-foreground">
                    +{lastTeamSetup.names.length - 5} more
                  </span>
                )}
              </div>

              <button
                onClick={() => onLoadTeams(lastTeamSetup)}
                className="w-full px-4 py-3 rounded-xl text-base font-medium
                  bg-success hover:bg-success/90 text-white
                  transition-colors duration-200
                  focus:outline-none focus:ring-4 focus:ring-success/50"
                aria-label={`Load ${lastTeamSetup.count} saved teams`}
              >
                Load Teams
              </button>
            </div>
          )}

          {/* No saved teams message */}
          {(!lastTeamSetup || lastTeamSetup.count === 0) && status === 'setup' && (
            <p className="text-base text-muted-foreground text-center py-2">
              No saved team setup available
            </p>
          )}
        </div>
      </section>

      {/* Disabled state message */}
      {isDisabled && (
        <p className="text-base text-warning text-center py-2">
          Settings can only be changed during game setup
        </p>
      )}
    </div>
  );
}

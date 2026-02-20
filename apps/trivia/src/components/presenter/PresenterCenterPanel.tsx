'use client';

/**
 * T4.7: PresenterCenterPanel
 *
 * Extracted center panel content from play/page.tsx.
 * Contains:
 * - QuestionDisplay card
 * - NextActionHint
 * - Keyboard shortcuts reference
 * - Theme settings
 * - Settings panel (conditional)
 * - Setup mode content (SetupWizard when status === 'setup')
 * - Round summary
 */

import { ThemeSelector } from '@joolie-boolie/ui';
import type { ThemeMode } from '@joolie-boolie/types';
import { QuestionDisplay } from '@/components/presenter/QuestionDisplay';
import { NextActionHint } from '@/components/presenter/NextActionHint';
import { SettingsPanel } from '@/components/presenter/SettingsPanel';
import { SetupWizard } from '@/components/presenter/SetupWizard';
import { RoundSummary } from '@/components/presenter/RoundSummary';
import type { Question, Team, GameStatus } from '@/types';
import type { QuestionCategory } from '@/types';
import type { TeamSetup, SettingsState } from '@/stores/settings-store';

export interface PresenterCenterPanelProps {
  // Game state
  status: GameStatus;
  selectedQuestion: Question | null;
  peekAnswer: boolean;
  displayQuestionIndex: number | null;
  selectedQuestionIndex: number;
  questionInRoundProgress: string;
  roundProgress: string;
  currentRound: number;
  totalRounds: number;
  isLastRound: boolean;
  roundWinners: Team[];
  teamsSortedByScore: Team[];
  teams: Team[];
  canStart: boolean;

  // Theme
  presenterTheme: ThemeMode;
  displayTheme: ThemeMode;
  onPresenterThemeChange: (theme: ThemeMode) => void;
  onDisplayThemeChange: (theme: ThemeMode) => void;

  // Question display actions
  onTogglePeek: () => void;
  onToggleDisplay: () => void;
  onShowHelp: () => void;

  // Settings panel
  showSettings: boolean;
  roundsCount: number;
  questionsPerRound: number;
  timerDuration: number;
  timerAutoStart: boolean;
  timerVisible: boolean;
  ttsEnabled: boolean;
  revealMode: 'instant' | 'batch';
  lastTeamSetup: TeamSetup | null;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onLoadTeams: (teamSetup: TeamSetup) => void;
  onSaveTeams: () => void;

  // Setup wizard props
  questions: Question[];
  onImport: (questions: Question[], mode?: 'replace' | 'append') => void;
  selectedCategories: QuestionCategory[];
  onCategoryChange: (categories: QuestionCategory[]) => void;
  onSaveQuestionSet: () => void;
  onSavePreset: () => void;
  onAddTeam: (name?: string) => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
  onLoadTeamsFromSetup: (names: string[]) => void;
  onSaveTemplate: () => void;
  onStartGame: () => void;

  // Round summary
  showRoundSummary: boolean;
  onNextRound: () => void;
  onCloseRoundSummary: () => void;
}

export function PresenterCenterPanel({
  // Game state
  status,
  selectedQuestion,
  peekAnswer,
  displayQuestionIndex,
  selectedQuestionIndex,
  questionInRoundProgress,
  roundProgress,
  currentRound,
  totalRounds,
  isLastRound,
  roundWinners,
  teamsSortedByScore,
  teams,
  canStart,

  // Theme
  presenterTheme,
  displayTheme,
  onPresenterThemeChange,
  onDisplayThemeChange,

  // Question display actions
  onTogglePeek,
  onToggleDisplay,
  onShowHelp,

  // Settings panel
  showSettings,
  roundsCount,
  questionsPerRound,
  timerDuration,
  timerAutoStart,
  timerVisible,
  ttsEnabled,
  revealMode,
  lastTeamSetup,
  onUpdateSetting,
  onLoadTeams,
  onSaveTeams,

  // Setup wizard props
  questions,
  onImport,
  selectedCategories,
  onCategoryChange,
  onSaveQuestionSet,
  onSavePreset,
  onAddTeam,
  onRemoveTeam,
  onRenameTeam,
  onLoadTeamsFromSetup,
  onSaveTemplate,
  onStartGame,

  // Round summary
  showRoundSummary,
  onNextRound,
  onCloseRoundSummary,
}: PresenterCenterPanelProps) {
  return (
    <>
      {/* Question display */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
        <QuestionDisplay
          question={selectedQuestion}
          peekAnswer={peekAnswer}
          onTogglePeek={onTogglePeek}
          onToggleDisplay={onToggleDisplay}
          progress={questionInRoundProgress}
          roundProgress={roundProgress}
          isOnDisplay={displayQuestionIndex === selectedQuestionIndex}
        />
      </div>

      {/* Next action hint */}
      <div className="mb-4 px-1">
        <NextActionHint />
      </div>

      {/* Keyboard shortcuts reference */}
      <div className="hidden md:block bg-surface border border-border rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
          <button
            onClick={onShowHelp}
            className="text-sm text-primary hover:text-primary/80 underline min-h-[var(--size-touch)] flex items-center"
          >
            View all
          </button>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between">
            <span className="text-foreground-secondary">Navigate questions</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">Up</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">Down</kbd>
            </div>
          </li>
          <li className="flex justify-between">
            <span className="text-foreground-secondary">Peek answer</span>
            <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">Space</kbd>
          </li>
          <li className="flex justify-between">
            <span className="text-foreground-secondary">Toggle display</span>
            <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">D</kbd>
          </li>
          <li className="flex justify-between">
            <span className="text-foreground-secondary">Fullscreen</span>
            <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded font-mono text-xs">F</kbd>
          </li>
        </ul>
      </div>

      {/* Theme settings */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-sm mb-4">
        <ThemeSelector
          presenterTheme={presenterTheme}
          displayTheme={displayTheme}
          onPresenterThemeChange={onPresenterThemeChange}
          onDisplayThemeChange={onDisplayThemeChange}
        />
      </div>

      {/* Settings panel (toggled from header) */}
      {showSettings && (
        <div className="bg-surface border border-border rounded-xl p-3 shadow-sm mb-4">
          <SettingsPanel
            status={status}
            roundsCount={roundsCount}
            questionsPerRound={questionsPerRound}
            timerDuration={timerDuration}
            timerAutoStart={timerAutoStart}
            timerVisible={timerVisible}
            ttsEnabled={ttsEnabled}
            lastTeamSetup={lastTeamSetup}
            currentTeams={teams}
            onUpdateSetting={onUpdateSetting}
            onLoadTeams={onLoadTeams}
            onSaveTeams={onSaveTeams}
          />
        </div>
      )}

      {/* Setup mode: SetupWizard */}
      {status === 'setup' && (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm mb-4">
          <SetupWizard
            questions={questions}
            onImport={onImport}
            selectedCategories={selectedCategories}
            onCategoryChange={onCategoryChange}
            onSaveQuestionSet={onSaveQuestionSet}
            roundsCount={roundsCount}
            questionsPerRound={questionsPerRound}
            timerDuration={timerDuration}
            timerAutoStart={timerAutoStart}
            timerVisible={timerVisible}
            ttsEnabled={ttsEnabled}
            revealMode={revealMode}
            lastTeamSetup={lastTeamSetup}
            currentTeams={teams}
            onUpdateSetting={onUpdateSetting}
            onLoadTeams={onLoadTeams}
            onSaveTeams={onSaveTeams}
            onSavePreset={onSavePreset}
            canStart={canStart}
            onAddTeam={onAddTeam}
            onRemoveTeam={onRemoveTeam}
            onRenameTeam={onRenameTeam}
            onLoadTeamsFromSetup={onLoadTeamsFromSetup}
            onSaveTemplate={onSaveTemplate}
            onStartGame={onStartGame}
          />
        </div>
      )}

      {/* Round summary */}
      {showRoundSummary && (
        <div className="mt-4">
          <RoundSummary
            currentRound={currentRound}
            totalRounds={totalRounds}
            roundWinners={roundWinners}
            teamsSortedByScore={teamsSortedByScore}
            isLastRound={isLastRound}
            onNextRound={onNextRound}
            onClose={onCloseRoundSummary}
          />
        </div>
      )}
    </>
  );
}

'use client';

/**
 * T4.1: SetupWizard — 4-step presenter setup wizard
 *
 * Replaces the flat setup section in play/page.tsx when game.status === 'setup'.
 *
 * Steps:
 *   0 — Questions  (WizardStepQuestions)
 *   1 — Settings   (WizardStepSettings)
 *   2 — Teams      (WizardStepTeams)
 *   3 — Review     (WizardStepReview)
 *
 * Features:
 * - Step indicators with labels
 * - Back / Next navigation
 * - AnimatePresence step transitions (opacity fade, mode="wait")
 * - 44x44px touch targets on all interactive elements
 * - Dark-mode compatible via CSS variables
 * - Auto-loads user's default template on mount
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WizardStepQuestions } from '@/components/presenter/WizardStepQuestions';
import { WizardStepSettings } from '@/components/presenter/WizardStepSettings';
import { WizardStepTeams } from '@/components/presenter/WizardStepTeams';
import { WizardStepReview } from '@/components/presenter/WizardStepReview';
import { useAutoLoadDefaultTemplate } from '@/hooks/use-auto-load-default-template';
import type { GameSetupValidation } from '@/lib/game/selectors';
import type { TeamSetup, SettingsState } from '@/stores/settings-store';
import type { Team, Question, QuestionCategory } from '@/types';

export interface SetupWizardProps {
  // Questions
  questions: Question[];
  onImport: (questions: Question[], mode?: 'replace' | 'append') => void;
  selectedCategories: QuestionCategory[];
  onCategoryChange: (categories: QuestionCategory[]) => void;
  onSaveQuestionSet: () => void;

  // Settings
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

  // Validation & launch
  validation: GameSetupValidation;
  canStart: boolean;
  onAddTeam: (name?: string) => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
  onLoadTeamsFromSetup: (names: string[]) => void;
  onSaveTemplate: () => void;
  onStartGame: () => void;
}

const STEPS = [
  { label: 'Questions', shortLabel: '1' },
  { label: 'Settings', shortLabel: '2' },
  { label: 'Teams', shortLabel: '3' },
  { label: 'Review', shortLabel: '4' },
] as const;

export function SetupWizard({
  // Questions
  questions,
  onImport,
  selectedCategories,
  onCategoryChange,
  onSaveQuestionSet,

  // Settings
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

  // Validation & launch
  validation,
  canStart,
  onAddTeam,
  onRemoveTeam,
  onRenameTeam,
  onLoadTeamsFromSetup,
  onSaveTemplate,
  onStartGame,
}: SetupWizardProps) {
  useAutoLoadDefaultTemplate();

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = STEPS.length;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goToStep = (step: number) => setCurrentStep(step);

  return (
    <div className="flex flex-col gap-4">
      {/* Step indicators */}
      <nav aria-label="Setup steps" className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <button
              key={index}
              data-testid={`wizard-step-${index}`}
              type="button"
              onClick={() => setCurrentStep(index)}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50
                ${isActive
                  ? 'bg-primary/15 text-primary'
                  : isComplete
                  ? 'bg-success/10 text-success hover:bg-success/15'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-surface-hover'
                }`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                    ? 'bg-success text-white'
                    : 'bg-surface-elevated text-foreground-secondary border border-border'
                  }`}
              >
                {isComplete ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.shortLabel
                )}
              </span>
              <span className="hidden sm:block">{step.label}</span>
            </button>
          );
        })}

        {/* Step counter */}
        <span className="ml-auto text-sm text-foreground-secondary font-medium">
          {currentStep + 1} / {totalSteps}
        </span>
      </nav>

      {/* Step content with animated transition */}
      <div className="min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentStep === 0 && (
              <WizardStepQuestions
                questions={questions}
                onImport={onImport}
                selectedCategories={selectedCategories}
                onCategoryChange={onCategoryChange}
                onSaveQuestionSet={onSaveQuestionSet}
              />
            )}

            {currentStep === 1 && (
              <WizardStepSettings
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
                onSavePreset={onSavePreset}
              />
            )}

            {currentStep === 2 && (
              <WizardStepTeams
                teams={currentTeams}
                questionCount={questions.length}
                roundsCount={roundsCount}
                lastTeamSetup={lastTeamSetup}
                onAddTeam={onAddTeam}
                onRemoveTeam={onRemoveTeam}
                onRenameTeam={onRenameTeam}
                onLoadTeamsFromSetup={onLoadTeamsFromSetup}
                onSaveTeams={onSaveTeams}
              />
            )}

            {currentStep === 3 && (
              <WizardStepReview
                validation={validation}
                canStart={canStart}
                questions={questions}
                teams={currentTeams}
                roundsCount={roundsCount}
                questionsPerRound={questionsPerRound}
                timerDuration={timerDuration}
                onGoToStep={goToStep}
                onSaveTemplate={onSaveTemplate}
                onStartGame={onStartGame}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 0}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]
            focus:outline-none focus:ring-2 focus:ring-primary/50
            ${currentStep === 0
              ? 'opacity-0 pointer-events-none'
              : 'bg-surface-elevated hover:bg-surface-hover text-foreground border border-border'
            }`}
          aria-hidden={currentStep === 0}
        >
          Back
        </button>

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold
              bg-primary hover:bg-primary-hover text-primary-foreground
              transition-colors min-h-[44px]
              focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Next: {STEPS[currentStep + 1].label}
          </button>
        ) : (
          /* On the last step, Start Game is inside WizardStepReview */
          <div />
        )}
      </div>
    </div>
  );
}

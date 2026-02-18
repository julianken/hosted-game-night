'use client';

import { useId, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useToast } from "@joolie-boolie/ui";
import type { Question, QuestionCategory } from '@/types';
import { questionsToTriviaQuestions } from '@/lib/questions/conversion';
import {
  DEFAULT_CATEGORIES,
  getApiCategoriesForInternal,
  getCategoryBadgeClasses,
  getCategoryFilterActiveClasses,
  getCategoryName,
} from '@/lib/categories';

// ---------------------------------------------------------------------------
// Local types and constants
// ---------------------------------------------------------------------------

export interface TriviaApiImporterProps {
  disabled?: boolean;
  onSaveSuccess?: () => void;
}

type ImporterState = 'idle' | 'loading' | 'preview' | 'saving' | 'error';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

// Difficulty badge classes -- used in preview list for per-question difficulty display.
// 'mixed' is intentionally excluded from display (no badge rendered when difficulty is mixed).
const DIFFICULTY_BADGE_CLASSES: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
  medium: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700',
  hard: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700',
  mixed: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};

const COUNT_MIN = 5;
const COUNT_MAX = 50;
const COUNT_STEP = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriviaApiImporter({
  disabled = false,
  onSaveSuccess,
}: TriviaApiImporterProps) {
  const difficultyGroupId = useId();
  const countSliderId = useId();
  const excludeNicheId = useId();
  const saveNameId = useId();
  const saveDescriptionId = useId();

  const { success, error: errorToast } = useToast();

  // Granular store subscriptions -- same pattern as QuestionSetSelector
  const importQuestions = useGameStore((state) => state.importQuestions);
  const gameStatus = useGameStore((state) => state.status);
  const questionsPerRound = useGameStore((state) => state.settings.questionsPerRound);

  // State machine
  const [state, setState] = useState<ImporterState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form parameters
  const [selectedCategories, setSelectedCategories] = useState<QuestionCategory[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [count, setCount] = useState<number>(20);
  const [excludeNiche, setExcludeNiche] = useState<boolean>(true);

  // Save form fields (shown in preview state)
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setState('idle');
    setQuestions([]);
    setError(null);
    setSaveError(null);
    setSaveName('');
    setSaveDescription('');
  }, []);

  const handleCategoryToggle = useCallback((categoryId: QuestionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleFetch = useCallback(async () => {
    setState('loading');
    setError(null);
    setQuestions([]);
    setSaveError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', String(count));
      if (selectedCategories.length > 0) {
        const apiCategories = selectedCategories.flatMap(getApiCategoriesForInternal);
        if (apiCategories.length > 0) {
          params.set('categories', apiCategories.join(','));
        }
      }
      if (difficulty !== 'mixed') {
        params.set('difficulties', difficulty);
      }
      if (excludeNiche) {
        params.set('excludeNiche', 'true');
      }

      const response = await fetch(`/api/trivia-api/questions?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            `Failed to fetch questions (${response.status})`
        );
      }

      const data = (await response.json()) as { questions: Question[] };

      if (!data.questions || data.questions.length === 0) {
        throw new Error(
          'No questions found for the selected filters. Try different categories or a lower count.'
        );
      }

      // Pre-fill save name with a reasonable default
      const categoryLabel =
        selectedCategories.length === 0
          ? 'Mixed'
          : selectedCategories.length === 1
            ? getCategoryName(selectedCategories[0])
            : `${selectedCategories.length} Categories`;
      const difficultyLabel =
        difficulty === 'mixed'
          ? ''
          : ` (${DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label ?? ''})`;
      setSaveName(
        `${categoryLabel} Trivia${difficultyLabel} — ${data.questions.length} Questions`
      );

      setQuestions(data.questions);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setState('error');
    }
  }, [count, selectedCategories, difficulty, excludeNiche]);

  const handleLoadIntoGame = useCallback(() => {
    if (questions.length === 0) return;

    try {
      // Assign round indices using questionsPerRound -- same pattern as QuestionSetSelector
      const questionsWithRounds: Question[] = questions.map((q, index) => ({
        ...q,
        roundIndex: Math.floor(index / questionsPerRound),
      }));

      importQuestions(questionsWithRounds, 'replace');
      success(`Loaded ${questions.length} questions from Trivia API`);
      handleReset();
    } catch {
      errorToast('Failed to load questions into game');
    }
  }, [questions, questionsPerRound, importQuestions, success, errorToast, handleReset]);

  const handleSaveToQuestionSets = useCallback(async () => {
    if (questions.length === 0) return;
    if (!saveName.trim()) {
      setSaveError('Please enter a name for the question set');
      return;
    }

    setState('saving');
    setSaveError(null);

    try {
      // Convert app-level Question[] -> TriviaQuestion[] for DB storage.
      // We use POST /api/question-sets (not /import) because the questions
      // are already validated Question[] objects -- no raw JSON re-parsing needed.
      const triviaQuestions = questionsToTriviaQuestions(questions);

      const response = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDescription.trim() || undefined,
          questions: triviaQuestions,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? 'Failed to save question set'
        );
      }

      success(`Saved "${saveName.trim()}" to your question sets`);
      onSaveSuccess?.();
      handleReset();
    } catch (err) {
      // Transition back to preview to preserve fetched questions and save form
      setState('preview');
      setSaveError(err instanceof Error ? err.message : 'Failed to save question set');
    }
  }, [questions, saveName, saveDescription, success, onSaveSuccess, handleReset]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const isGameSetup = gameStatus === 'setup';
  // isDisabled gates the Fetch button; isGameSetup gates Load into Game separately
  const isDisabled = disabled || !isGameSetup;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4" role="region" aria-label="Fetch questions from Trivia API">
      <h3 className="text-lg font-semibold">Fetch from Trivia API</h3>

      {/* Status guard -- mirrors QuestionSetSelector warning pattern */}
      {!isGameSetup && state === 'idle' && (
        <p className="text-base text-warning" role="alert">
          API question fetching is only available during game setup.
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* IDLE STATE: parameter form                                          */}
      {/* ------------------------------------------------------------------ */}
      {state === 'idle' && isGameSetup && (
        <div className="space-y-5">
          {/* Category multi-select */}
          <fieldset>
            <legend className="text-base font-medium mb-2">
              Categories{' '}
              <span className="text-muted-foreground font-normal text-base">
                (none = all)
              </span>
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Category selection">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    aria-pressed={isSelected}
                    className={`
                      min-h-[44px] px-3 py-1.5 rounded-full border text-base font-medium
                      transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
                      ${isSelected
                        ? getCategoryFilterActiveClasses(cat.id)
                        : `${getCategoryBadgeClasses(cat.id)} hover:opacity-80`
                      }
                    `}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="mt-2 text-base text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors min-h-[44px] px-1"
              >
                Clear selection
              </button>
            )}
          </fieldset>

          {/* Difficulty selector -- pseudo-radio group using buttons */}
          <fieldset>
            <legend className="text-base font-medium mb-2">Difficulty</legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby={difficultyGroupId}
            >
              <span id={difficultyGroupId} className="sr-only">
                Select difficulty level
              </span>
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setDifficulty(opt.value)}
                    className={`
                      min-h-[44px] px-4 py-1.5 rounded-lg border text-base font-medium
                      transition-colors
                      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
                      ${isSelected
                        ? DIFFICULTY_BADGE_CLASSES[opt.value]
                        : 'bg-background border-border hover:bg-muted/50'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Question count slider */}
          <div className="space-y-2">
            <label htmlFor={countSliderId} className="text-base font-medium">
              Number of Questions:{' '}
              <span className="font-bold text-foreground">{count}</span>
            </label>
            <input
              id={countSliderId}
              type="range"
              min={COUNT_MIN}
              max={COUNT_MAX}
              step={COUNT_STEP}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-2 rounded-full bg-muted accent-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
              aria-valuemin={COUNT_MIN}
              aria-valuemax={COUNT_MAX}
              aria-valuenow={count}
              aria-valuetext={`${count} questions`}
            />
            <div className="flex justify-between text-base text-muted-foreground">
              <span>{COUNT_MIN}</span>
              <span>{COUNT_MAX}</span>
            </div>
          </div>

          {/* Exclude niche toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id={excludeNicheId}
              role="switch"
              aria-checked={excludeNiche}
              onClick={() => setExcludeNiche((prev) => !prev)}
              aria-labelledby={`${excludeNicheId}-label`}
              className={`
                relative inline-flex min-h-[28px] w-12 shrink-0 items-center
                rounded-full border-2 transition-colors
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
                ${excludeNiche ? 'bg-primary border-primary' : 'bg-muted border-border'}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 rounded-full bg-white shadow-sm
                  transform transition-transform
                  ${excludeNiche ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            <label
              id={`${excludeNicheId}-label`}
              htmlFor={excludeNicheId}
              className="text-base font-medium cursor-pointer select-none"
            >
              Exclude niche questions{' '}
              <span className="text-muted-foreground font-normal">
                (recommended for casual play)
              </span>
            </label>
          </div>

          {/* Fetch button */}
          <button
            type="button"
            onClick={handleFetch}
            disabled={isDisabled}
            className="
              w-full min-h-[56px] px-6 py-3 rounded-lg
              text-lg font-semibold transition-colors
              bg-primary text-primary-foreground hover:bg-primary/90
              focus:outline-none focus:ring-4 focus:ring-primary/50
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Fetch Questions
          </button>

          <p className="text-base text-muted-foreground">
            Powered by{' '}
            <a
              href="https://the-trivia-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              The Trivia API
            </a>{' '}
            (free, no account required)
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* LOADING STATE                                                        */}
      {/* ------------------------------------------------------------------ */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin motion-reduce:animate-none text-2xl" aria-hidden="true">
              &#8987;
            </div>
            <p className="text-base text-muted-foreground">Fetching questions...</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SAVING STATE                                                         */}
      {/* ------------------------------------------------------------------ */}
      {state === 'saving' && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin motion-reduce:animate-none text-2xl" aria-hidden="true">
              &#8987;
            </div>
            <p className="text-base text-muted-foreground">Saving question set...</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ERROR STATE                                                          */}
      {/* ------------------------------------------------------------------ */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg" role="alert">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">&#9888;&#65039;</span>
              <div>
                <p className="font-medium text-error">Error: Failed to Fetch Questions</p>
                <p className="text-base text-error mt-1">{error}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-4 min-h-[48px] py-2 bg-muted hover:bg-muted/80 rounded-lg text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PREVIEW STATE                                                        */}
      {/* ------------------------------------------------------------------ */}
      {state === 'preview' && questions.length > 0 && (
        <div className="space-y-4" aria-live="polite">
          {/* Summary bar */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-medium text-lg">
              {questions.length} question{questions.length !== 1 ? 's' : ''} fetched
            </p>
            <p className="text-base text-muted-foreground mt-1">
              Review below, then load into game or save to your library.
            </p>
          </div>

          {/* Inline save error */}
          {saveError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg" role="alert">
              <p className="text-base text-error">
                <span className="font-semibold">Error:</span> {saveError}
              </p>
            </div>
          )}

          {/* Question preview list -- all questions, scrollable */}
          <div className="space-y-2">
            <p className="text-base font-medium">Questions</p>
            <div
              className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border"
              role="list"
              aria-label={`${questions.length} fetched questions`}
            >
              {questions.map((q, i) => {
                // The BFF may attach difficulty to Question objects (extended shape).
                // The Question type does not include difficulty -- access via cast.
                const qDifficulty = (q as Question & { difficulty?: Difficulty }).difficulty;
                return (
                  <div key={q.id} className="px-3 py-3 space-y-1" role="listitem">
                    {/* Question number + text */}
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0 text-base font-medium min-w-[2rem]">
                        Q{i + 1}.
                      </span>
                      <p className="text-base">{q.text}</p>
                    </div>
                    {/* Correct answer + badges */}
                    <div className="flex items-center flex-wrap gap-2 pl-8">
                      <span className="text-base text-success font-medium">
                        &#10003; {q.optionTexts[q.options.indexOf(q.correctAnswers[0])]}
                      </span>
                      <span
                        className={`text-base px-2 py-0.5 rounded-full border ${getCategoryBadgeClasses(q.category)}`}
                      >
                        {getCategoryName(q.category)}
                      </span>
                      {qDifficulty && qDifficulty !== 'mixed' && (
                        <span
                          className={`text-base px-2 py-0.5 rounded-full border ${DIFFICULTY_BADGE_CLASSES[qDifficulty]}`}
                        >
                          {DIFFICULTY_OPTIONS.find((d) => d.value === qDifficulty)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save form -- name + description */}
          <div className="space-y-2">
            <label htmlFor={saveNameId} className="text-lg font-medium block">
              Name <span className="text-error">*</span>
            </label>
            <input
              id={saveNameId}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Science Mix — 20 Questions"
              className="w-full px-3 py-2 min-h-[48px] border border-border rounded-lg text-base bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={saveDescriptionId} className="text-lg font-medium block">
              Description
            </label>
            <input
              id={saveDescriptionId}
              type="text"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              maxLength={250}
              placeholder="Optional description"
              className="w-full px-3 py-2 min-h-[48px] border border-border rounded-lg text-base bg-background"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Cancel */}
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 min-h-[48px] py-2 bg-muted hover:bg-muted/80 rounded-lg text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Cancel
            </button>

            {/* Load into Game */}
            <button
              type="button"
              onClick={handleLoadIntoGame}
              disabled={!isGameSetup}
              title={!isGameSetup ? 'Game must be in setup mode to load questions' : undefined}
              className={`
                flex-1 px-4 min-h-[48px] py-2 rounded-lg
                text-base font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-primary/50
                ${isGameSetup
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
            >
              Load into Game
            </button>

            {/* Save to My Question Sets */}
            <button
              type="button"
              onClick={handleSaveToQuestionSets}
              disabled={!saveName.trim()}
              className={`
                flex-1 px-4 min-h-[48px] py-2 rounded-lg
                text-base font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-primary/50
                ${saveName.trim()
                  ? 'bg-success text-white hover:bg-success/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
            >
              Save to My Question Sets
            </button>
          </div>

          {/* Warning when game is not in setup (Load into Game disabled) */}
          {!isGameSetup && (
            <p className="text-base text-warning" role="alert">
              &quot;Load into Game&quot; is only available during game setup. You can still save to your library.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

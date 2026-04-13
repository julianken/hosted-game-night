/**
 * SetupGate.test.tsx
 *
 * BEA-713 regression coverage: SetupGate must NOT mutate persisted user
 * settings on mount in response to question-derived state.
 *
 * Background: Two racing useEffects in SetupGate previously clamped
 * `roundsCount` and forced `isByCategory: false` whenever the imported
 * question set had >4 categories. This silently overwrote the user's saved
 * preferences and broke the round-config E2E specs after the fixture's
 * masking seed was removed (BEA-705 / BEA-697).
 *
 * The fix derives `effectiveIsByCategory` and `effectiveRoundsCount` at render
 * time and leaves persisted intent untouched. These tests guard that contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, type RenderResult } from '@testing-library/react';
import { ToastProvider } from '@joolie-boolie/ui';
import { SetupGate } from '../SetupGate';
import { useSettingsStore, SETTINGS_DEFAULTS } from '@/stores/settings-store';
import { useGameStore } from '@/stores/game-store';
import { createInitialState } from '@/lib/game/engine';
import type { Question, QuestionCategory } from '@/types';

// ---------------------------------------------------------------------------
// localStorage mock — required for the persisted settings store assertions
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    /** Test-only inspection helper (not part of the real Storage API). */
    _raw: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let qCounter = 0;
function makeQuestion(roundIndex: number, category: QuestionCategory): Question {
  qCounter += 1;
  return {
    id: `q-${qCounter}`,
    text: `Test question ${qCounter}`,
    type: 'multiple_choice',
    correctAnswers: ['A'],
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],
    category,
    roundIndex,
  } as Question;
}

/**
 * Build a question set that exercises N unique categories. Returns roughly
 * 15 questions distributed across rounds, mirroring the e2e fixture shape.
 */
function buildQuestionsWithCategories(categories: QuestionCategory[]): Question[] {
  const questions: Question[] = [];
  // Spread questions across rounds 0–2, cycling through the supplied categories
  // so every category appears at least once.
  const total = Math.max(15, categories.length);
  for (let i = 0; i < total; i += 1) {
    const cat = categories[i % categories.length];
    const roundIndex = i % 3;
    questions.push(makeQuestion(roundIndex, cat));
  }
  return questions;
}

const SEVEN_CATEGORIES: QuestionCategory[] = [
  'geography',
  'science',
  'general_knowledge',
  'art_literature',
  'history',
  'sports',
  'entertainment',
];

const THREE_CATEGORIES: QuestionCategory[] = ['geography', 'science', 'history'];

// ---------------------------------------------------------------------------
// Common harness props
// ---------------------------------------------------------------------------

function defaultProps() {
  return {
    isConnected: true,
    onOpenDisplay: vi.fn(),
    onStartGame: vi.fn(),
  };
}

/** Render SetupGate inside a ToastProvider (required by TriviaApiImporter). */
function renderGate(): RenderResult {
  return render(
    <ToastProvider>
      <SetupGate {...defaultProps()} />
    </ToastProvider>,
  );
}

function seedSettings(overrides: Partial<typeof SETTINGS_DEFAULTS> = {}): void {
  // Replace the in-memory store and the persisted blob so the assertions in
  // the test bodies can inspect either reliably.
  const next = { ...SETTINGS_DEFAULTS, ...overrides };
  useSettingsStore.setState(next);
  localStorageMock.setItem(
    'trivia-settings',
    JSON.stringify({ state: next, version: 4 }),
  );
}

function seedQuestions(questions: Question[]): void {
  useGameStore.setState({
    ...createInitialState(),
    questions,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetupGate (BEA-713 — purely derived effective settings)', () => {
  beforeEach(() => {
    qCounter = 0;
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset both stores to clean defaults.
    useSettingsStore.setState(SETTINGS_DEFAULTS);
    useGameStore.setState({ ...createInitialState(), questions: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('does NOT mutate persisted settings on mount with a 7-category seed', () => {
    // Seed the production defaults: by-category on, 3 rounds.
    seedSettings({ isByCategory: true, roundsCount: 3 });
    seedQuestions(buildQuestionsWithCategories(SEVEN_CATEGORIES));

    renderGate();

    // The persisted user-intent values must be untouched.
    const settings = useSettingsStore.getState();
    expect(settings.isByCategory).toBe(true);
    expect(settings.roundsCount).toBe(3);

    // localStorage blob (what survives a reload) must also be unchanged.
    const raw = localStorageMock._raw()['trivia-settings'];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.isByCategory).toBe(true);
    expect(parsed.state.roundsCount).toBe(3);
  });

  it('renders the wizard with effective values (by-category off, userRoundsCount kept) when categories exceed the limit', async () => {
    seedSettings({ isByCategory: true, roundsCount: 3 });
    seedQuestions(buildQuestionsWithCategories(SEVEN_CATEGORIES));

    renderGate();

    // With 7 unique categories, canUseByCategory is false → the toggle is
    // hidden by WizardStepSettings (it only renders when canUseByCategory).
    // Navigate to the Settings step (index 1) to verify.
    fireEvent.click(screen.getByTestId('wizard-step-1'));

    // Wait for the Settings step content to mount (AnimatePresence transition).
    // The "Number of Rounds" slider is unique to the Settings step.
    const roundsSlider = await screen.findByRole('slider', { name: /number of rounds/i });
    expect(roundsSlider).toBeInTheDocument();

    // The "By Category" toggle is hidden because canUseByCategory is false.
    // (The Settings step only renders the Toggle when canUseByCategory === true.)
    expect(screen.queryByRole('switch', { name: /by category/i })).not.toBeInTheDocument();

    // The "questions per round" hint (rendered when !effectiveIsByCategory && totalQuestions > 0)
    // should reflect the user's *unmutated* roundsCount = 3 → ceil(15/3) = 5.
    expect(screen.getByText(/questions per round/i)).toHaveTextContent('~5 questions per round');
  });

  it('keeps user-initiated toggle behaviour intact (3-category seed → toggle off persists)', async () => {
    // Seed: by-category on with a 3-category set so the toggle is visible.
    seedSettings({ isByCategory: true, roundsCount: 3 });
    seedQuestions(buildQuestionsWithCategories(THREE_CATEGORIES));

    renderGate();

    // Navigate to Settings step and wait for it to mount.
    fireEvent.click(screen.getByTestId('wizard-step-1'));
    const toggle = await screen.findByRole('switch', { name: /by category/i });

    // Toggle is visible (canUseByCategory true with 3 ≤ 4) and reflects user intent.
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Simulate the user explicitly turning by-category off.
    fireEvent.click(toggle);

    // Persisted intent MUST reflect the user's deliberate action.
    expect(useSettingsStore.getState().isByCategory).toBe(false);
  });

  it('clamps effective roundsCount to uniqueCategoryCount when by-category is effective and user roundsCount exceeds it', async () => {
    // 3 categories, user prefers 6 rounds → effective should be 3.
    seedSettings({ isByCategory: true, roundsCount: 6 });
    seedQuestions(buildQuestionsWithCategories(THREE_CATEGORIES));

    renderGate();

    fireEvent.click(screen.getByTestId('wizard-step-1'));

    // Wait for the Settings step to mount.
    await screen.findByRole('slider', { name: /number of rounds/i });

    // The Slider's rendered SliderOutput reflects the *effective* roundsCount (3),
    // not the user's persisted intent (6). The Number of Rounds label sits next
    // to a tabular-numeric output; we assert the output reads "3".
    const roundsLabel = screen.getByText('Number of Rounds');
    const labelRow = roundsLabel.parentElement!;
    expect(labelRow).toHaveTextContent(/Number of Rounds\s*3/);

    // Persisted intent (6) must be untouched.
    expect(useSettingsStore.getState().roundsCount).toBe(6);
  });
});

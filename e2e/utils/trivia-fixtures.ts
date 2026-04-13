/**
 * Trivia E2E seed fixtures.
 *
 * The trivia game store intentionally starts with zero questions after the
 * standalone conversion (BEA commit 397fe843 removed the auto-template
 * useEffect in SetupWizard). In production this is correct — users must fetch
 * questions explicitly via the Trivia API importer. For Playwright tests,
 * however, we need a deterministic canned set so `startGameViaWizard` can pass
 * the step-0 (Questions) completion gate.
 *
 * How the seed is applied:
 *   1. The Playwright fixture calls `page.addInitScript(...)` with the
 *      generated init script below, BEFORE navigating to /play.
 *   2. `addInitScript` runs on every frame/navigation, so it fires before any
 *      React code (and before `useGameStore`'s `create()` executes).
 *   3. The init script sets `window.__triviaE2EQuestions` to the canned array.
 *   4. `apps/trivia/src/stores/game-store.ts::readInitialQuestions()` picks up
 *      the global and uses it as the store's initial `questions` array.
 *
 * Production code (no window global set) is unchanged: the store still starts
 * with an empty `questions` array.
 *
 * Shape: 15 questions × 3 rounds × 5 questions-per-round — matches
 * DEFAULT_ROUNDS (3) and QUESTIONS_PER_ROUND (5) in apps/trivia/src/types.
 * Keeping the set small and self-contained (no imports from app source) avoids
 * coupling this file to app internals; the structural contract is enforced at
 * runtime by SetupWizard's `isStepComplete(0)` which only asserts
 * `questions.length > 0`.
 *
 * See docs/plans/BEA-697-e2e-baseline-fix.md (Part C) for the full rationale.
 */

/**
 * Minimal structural type matching `Question` from apps/trivia/src/types.
 * Defined locally to avoid cross-app imports from the e2e tree.
 */
interface E2ETriviaQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  correctAnswers: string[];
  options: string[];
  optionTexts: string[];
  category: string;
  explanation?: string;
  roundIndex: number;
}

function makeMcQuestion(
  idSuffix: string,
  roundIndex: number,
  text: string,
  optionTexts: [string, string, string, string],
  correctIndex: number,
  category: string
): E2ETriviaQuestion {
  return {
    id: `e2e-r${roundIndex + 1}-${idSuffix}`,
    text,
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts,
    correctAnswers: [String.fromCharCode(65 + correctIndex)],
    category,
    roundIndex,
  };
}

/**
 * Canned 15-question set (3 rounds × 5 questions each) used by Playwright
 * fixtures to bypass the Trivia API importer during E2E runs.
 */
export const E2E_TRIVIA_QUESTIONS: readonly E2ETriviaQuestion[] = [
  // ---------------- Round 1 (general knowledge) ----------------
  makeMcQuestion('q1', 0, 'What is the capital of France?', ['Berlin', 'Madrid', 'Paris', 'Rome'], 2, 'geography'),
  makeMcQuestion('q2', 0, 'How many planets are in our solar system?', ['7', '8', '9', '10'], 1, 'science'),
  makeMcQuestion('q3', 0, 'Which ocean is the largest?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3, 'geography'),
  makeMcQuestion('q4', 0, 'What is 7 × 8?', ['54', '56', '64', '72'], 1, 'general_knowledge'),
  makeMcQuestion('q5', 0, 'Who painted the Mona Lisa?', ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], 2, 'art_literature'),

  // ---------------- Round 2 (science + history) ----------------
  makeMcQuestion('q1', 1, 'What is the chemical symbol for gold?', ['Go', 'Gd', 'Au', 'Ag'], 2, 'science'),
  makeMcQuestion('q2', 1, 'In what year did World War II end?', ['1943', '1944', '1945', '1946'], 2, 'history'),
  makeMcQuestion('q3', 1, 'What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2, 'science'),
  makeMcQuestion('q4', 1, 'Who was the first President of the United States?', ['Jefferson', 'Washington', 'Adams', 'Lincoln'], 1, 'history'),
  makeMcQuestion('q5', 1, 'What gas do plants absorb from the atmosphere?', ['Oxygen', 'Nitrogen', 'Hydrogen', 'Carbon Dioxide'], 3, 'science'),

  // ---------------- Round 3 (entertainment + sports) ----------------
  makeMcQuestion('q1', 2, 'How many players are on a standard soccer team?', ['9', '10', '11', '12'], 2, 'sports'),
  makeMcQuestion('q2', 2, 'Which instrument has 88 keys?', ['Guitar', 'Piano', 'Violin', 'Drum'], 1, 'entertainment'),
  makeMcQuestion('q3', 2, 'What sport uses a puck?', ['Football', 'Baseball', 'Hockey', 'Tennis'], 2, 'sports'),
  makeMcQuestion('q4', 2, 'Who wrote "Romeo and Juliet"?', ['Dickens', 'Shakespeare', 'Austen', 'Hemingway'], 1, 'art_literature'),
  makeMcQuestion('q5', 2, 'What is the largest mammal?', ['Elephant', 'Giraffe', 'Blue Whale', 'Hippo'], 2, 'science'),
];

/**
 * Zustand `persist` payload (version 4) that pins the trivia settings store to
 * deterministic defaults for E2E tests. Writing this to `localStorage` BEFORE
 * the store rehydrates bypasses two sources of test flakiness:
 *
 * 1. `isByCategory` defaults to `true` in production, and SetupGate contains a
 *    `useEffect` that clamps `roundsCount` to `min(uniqueCategoryCount, 6)`
 *    when `isByCategory` is true. The canned seed above spans 7 unique
 *    categories, so the effect would push `roundsCount` to 6 before
 *    `canUseByCategory` (≤ 4 categories) can flip `isByCategory` back off.
 *    Result: 6 rounds × 3 questions each, Round 6 empty, `canStart = false`.
 *
 * 2. Persisted state from a prior test run (in dev-server scenarios where a
 *    context is reused) could leave stale values that break the Review step.
 *
 * Pinning `isByCategory: false, roundsCount: 3` ensures the seed's 15
 * questions distribute evenly across 3 rounds (5 per round), every round is
 * populated, and `validateGameSetup().canStart` evaluates to true as soon as
 * `startGameViaWizard` adds the two default teams.
 */
const E2E_TRIVIA_SETTINGS_PERSIST = {
  state: {
    roundsCount: 3,
    questionsPerRound: 5,
    timerDuration: 30,
    timerAutoStart: false,
    timerVisible: true,
    timerAutoReveal: true,
    ttsEnabled: false,
    isByCategory: false,
    lastTeamSetup: null,
  },
  version: 4,
} as const;

/**
 * Builds an init script string suitable for `page.addInitScript({ content })`
 * that assigns the canned question set to `window.__triviaE2EQuestions`.
 *
 * NOTE: This helper intentionally does NOT touch `trivia-settings`
 * localStorage — pinning those defaults globally breaks specs that assert
 * the real production defaults (e.g. `round-config.spec.ts`, BEA-665). Specs
 * that need the deterministic settings seed should layer it in locally via
 * `buildTriviaSettingsSeedInitScript()` in a file-level `test.beforeEach`.
 */
export function buildTriviaSeedInitScript(): string {
  const serializedQuestions = JSON.stringify(E2E_TRIVIA_QUESTIONS);
  return `window.__triviaE2EQuestions = ${serializedQuestions};`;
}

/**
 * Builds an init script string that pre-populates the `trivia-settings`
 * Zustand `persist` entry in localStorage with deterministic defaults
 * (see E2E_TRIVIA_SETTINGS_PERSIST above). Apply this ONLY in specs that
 * depend on `isByCategory: false` / `roundsCount: 3` — for example
 * `presenter.spec.ts`, which drives the game past the setup wizard using
 * the canned 7-category seed. Do not place this in a shared fixture: it
 * masks the real production default and confuses specs that assert it.
 */
export function buildTriviaSettingsSeedInitScript(): string {
  const serializedSettings = JSON.stringify(E2E_TRIVIA_SETTINGS_PERSIST);
  // Wrap in try/catch so the init script never throws on contexts where
  // localStorage is unavailable (e.g. file:// fallbacks during diagnosis).
  return `try { window.localStorage.setItem('trivia-settings', JSON.stringify(${serializedSettings})); } catch (_e) {}`;
}

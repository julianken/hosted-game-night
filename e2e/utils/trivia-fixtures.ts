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
 * Zustand `persist` payload that pins the trivia settings store to deterministic
 * E2E defaults. Writing this to `localStorage` BEFORE the store rehydrates
 * bypasses two sources of test flakiness:
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
 *
 * IMPORTANT: This seed is opt-in, NOT applied by default. Tests that exercise
 * the setup wizard (e.g. `e2e/trivia/round-config.spec.ts`) assert production
 * defaults like `isByCategory: true`, and applying this override would break
 * those assertions. Only tests that skip past the wizard via
 * `startGameViaWizard` should opt in (by calling
 * `buildTriviaSettingsSeedInitScript()` alongside the questions seed, or by
 * passing `{ seedSettings: true }` to `buildTriviaSeedInitScript()`).
 *
 * The `state` shape mirrors `SETTINGS_DEFAULTS` from
 * `apps/trivia/src/stores/settings-store.ts`, with only the fields that need
 * to differ from production defaults overridden. The `version` matches the
 * current persist version in that store; if the store bumps its version, the
 * E2E seed should be updated in lockstep.
 */
const E2E_TRIVIA_SETTINGS_OVERRIDES = {
  isByCategory: false,
  timerAutoStart: false,
} as const;

const E2E_TRIVIA_SETTINGS_PERSIST_VERSION = 4;

/**
 * Lazily build the persist payload so we can include every field from the
 * production defaults without hand-duplicating them. The cost is negligible
 * (called once per `addInitScript` invocation) and keeps this file in sync
 * when new settings are added to `SETTINGS_DEFAULTS`.
 *
 * We intentionally inline the defaults rather than importing from the app
 * source tree — the e2e/ folder has no path into `apps/trivia/src/**`, and
 * cross-boundary imports would drag app-runtime dependencies into the
 * Playwright config. The fields below must stay structurally aligned with
 * `SETTINGS_DEFAULTS` in `apps/trivia/src/stores/settings-store.ts`.
 */
function buildTriviaSettingsPersistPayload(): {
  state: Record<string, unknown>;
  version: number;
} {
  return {
    state: {
      roundsCount: 3,
      questionsPerRound: 5,
      timerDuration: 30,
      timerAutoStart: true,
      timerVisible: true,
      timerAutoReveal: true,
      ttsEnabled: false,
      isByCategory: true,
      lastTeamSetup: null,
      // Overrides for deterministic E2E behaviour (see doc above).
      ...E2E_TRIVIA_SETTINGS_OVERRIDES,
    },
    version: E2E_TRIVIA_SETTINGS_PERSIST_VERSION,
  };
}

export interface BuildTriviaSeedOptions {
  /**
   * When true, assign the canned 15-question set to
   * `window.__triviaE2EQuestions` so the game store picks them up as its
   * initial `questions` array. Lets `startGameViaWizard` and wizard-driving
   * tests advance past step 0 (which gates on `questions.length > 0`) without
   * a network-dependent API fetch.
   *
   * Defaults to `false`. Specs that exercise the TriviaApiImporter UI or
   * assert the empty-questions starting state (e.g. `round-config.spec.ts`
   * BEA-665) should leave this off.
   */
  seedQuestions?: boolean;

  /**
   * When true, include the `trivia-settings` localStorage seed that pins
   * `isByCategory: false, roundsCount: 3` so `startGameViaWizard` can reach
   * a valid Review state with the canned 7-category question set.
   *
   * Defaults to `false`. Tests that assert production default settings
   * (e.g. `round-config.spec.ts`) should leave this off. Tests that skip the
   * wizard via `startGameViaWizard` should set it to `true`.
   */
  seedSettings?: boolean;
}

/**
 * Builds an init script string suitable for `page.addInitScript({ content })`
 * that optionally assigns the canned question set to
 * `window.__triviaE2EQuestions` and/or pre-populates the `trivia-settings`
 * localStorage entry with deterministic defaults.
 *
 * Both seeds are opt-in; with no options this returns an empty script. The
 * `e2e/fixtures/auth.ts::authenticatedTriviaPage` fixture enables both by
 * default and provides per-test opt-outs (`skipTriviaQuestionsSeed`,
 * `skipTriviaSettingsSeed`). Call this helper directly only when building a
 * custom fixture.
 *
 * Everything is serialised as JSON so the init script is a single
 * self-contained statement that does not depend on any module imports at
 * runtime.
 */
export function buildTriviaSeedInitScript(options: BuildTriviaSeedOptions = {}): string {
  const { seedQuestions = false, seedSettings = false } = options;
  const lines: string[] = [];
  if (seedQuestions) {
    const serializedQuestions = JSON.stringify(E2E_TRIVIA_QUESTIONS);
    lines.push(`window.__triviaE2EQuestions = ${serializedQuestions};`);
  }
  if (seedSettings) {
    lines.push(buildTriviaSettingsSeedInitScript());
  }
  return lines.join('\n');
}

/**
 * Builds just the `trivia-settings` localStorage seed portion of the init
 * script, suitable for `page.addInitScript({ content })` as a standalone
 * script. Callers that already have the questions seed in place can layer this
 * on top to override the store's production defaults.
 *
 * Wrapped in try/catch so the init script never throws on contexts where
 * localStorage is unavailable (e.g. file:// fallbacks during diagnosis).
 */
export function buildTriviaSettingsSeedInitScript(): string {
  const serializedSettings = JSON.stringify(buildTriviaSettingsPersistPayload());
  return `try { window.localStorage.setItem('trivia-settings', JSON.stringify(${serializedSettings})); } catch (_e) {}`;
}

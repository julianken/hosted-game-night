/**
 * In-memory template store for E2E testing
 *
 * Provides mock template data during E2E tests, following the same pattern
 * as e2e-profile-store.ts. Avoids fetching from downstream Bingo/Trivia APIs.
 */

interface E2EBingoTemplate {
  game: 'bingo';
  id: string;
  user_id: string;
  name: string;
  pattern_id: string;
  voice_pack: string;
  auto_call_enabled: boolean;
  auto_call_interval: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface E2ETriviaTemplate {
  game: 'trivia';
  id: string;
  user_id: string;
  name: string;
  questions: unknown[];
  rounds_count: number;
  questions_per_round: number;
  timer_duration: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type E2ETemplate = E2EBingoTemplate | E2ETriviaTemplate;

// In-memory store (server-side only, persists across requests during dev server lifetime)
const e2eTemplateStore: E2ETemplate[] = [
  {
    game: 'bingo',
    id: 'e2e-bingo-template-1',
    user_id: 'e2e-test-user',
    name: 'E2E Bingo Classic',
    pattern_id: 'standard-bingo',
    voice_pack: 'standard',
    auto_call_enabled: false,
    auto_call_interval: 5,
    is_default: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    game: 'trivia',
    id: 'e2e-trivia-template-1',
    user_id: 'e2e-test-user',
    name: 'E2E Trivia Night',
    questions: [
      { text: 'What is 2+2?', answer: '4', category: 'general_knowledge', type: 'short_answer' },
      { text: 'What color is the sky?', answer: 'Blue', category: 'science', type: 'short_answer' },
    ],
    rounds_count: 2,
    questions_per_round: 5,
    timer_duration: 30,
    is_default: false,
    created_at: '2026-01-02T00:00:00.000Z',
    updated_at: '2026-01-20T00:00:00.000Z',
  },
];

export function getE2ETemplates(): E2ETemplate[] {
  return [...e2eTemplateStore];
}

export function addE2ETemplate(template: E2ETemplate): void {
  e2eTemplateStore.push(template);
}

export function clearE2ETemplates(): void {
  e2eTemplateStore.length = 0;
}

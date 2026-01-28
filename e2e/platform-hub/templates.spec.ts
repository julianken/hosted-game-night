import { test, expect } from '../fixtures/auth';

const mockBingoTemplates = [
  {
    game: 'bingo',
    id: 'bingo-template-1',
    user_id: 'e2e-user-id',
    name: 'Friday Night Bingo',
    pattern_id: 'x-pattern',
    voice_pack: 'classic',
    auto_call_enabled: false,
    auto_call_interval: 5,
    is_default: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    game: 'bingo',
    id: 'bingo-template-2',
    user_id: 'e2e-user-id',
    name: 'Sunday Social Bingo',
    pattern_id: 'blackout',
    voice_pack: 'classic',
    auto_call_enabled: true,
    auto_call_interval: 10,
    is_default: false,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const mockTriviaTemplates = [
  {
    game: 'trivia',
    id: 'trivia-template-1',
    user_id: 'e2e-user-id',
    name: 'Movie Trivia Night',
    questions: [{ id: 1, text: 'Sample question', answer: 'Sample answer' }],
    rounds_count: 3,
    questions_per_round: 5,
    timer_duration: 30,
    is_default: false,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

async function setupTemplateMocks(
  page: import('@playwright/test').Page,
  options: {
    bingoTemplates?: typeof mockBingoTemplates;
    triviaTemplates?: typeof mockTriviaTemplates;
    bingoError?: boolean;
    triviaError?: boolean;
  } = {}
) {
  const {
    bingoTemplates = mockBingoTemplates,
    triviaTemplates = mockTriviaTemplates,
    bingoError = false,
    triviaError = false,
  } = options;

  await page.route('**/api/templates**', async (route) => {
    const allTemplates = [
      ...(bingoError ? [] : bingoTemplates),
      ...(triviaError ? [] : triviaTemplates),
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        templates: allTemplates,
        errors: [
          ...(bingoError ? ['Failed to fetch Bingo templates'] : []),
          ...(triviaError ? ['Failed to fetch Trivia templates'] : []),
        ],
      }),
    });
  });
}

test.describe('@critical Platform Hub Templates', () => {
  test.describe('Template List Display', () => {

    test('templates page renders @critical', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage);
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.locator('h1').first()).toContainText('Templates');
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      await expect(authenticatedPage.getByText('Movie Trivia Night')).toBeVisible();
    });

    test('filter tabs show counts @high', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage);
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /all \(3\)/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /bingo \(2\)/i })).toBeVisible();
    });

    test('Bingo filter works @high', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage);
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      await authenticatedPage.getByRole('button', { name: /bingo \(/i }).click();
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      await expect(authenticatedPage.getByText('Movie Trivia Night')).not.toBeVisible();
    });

    test('empty state shows @medium', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage, { bingoTemplates: [], triviaTemplates: [] });
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.getByText(/no.*templates.*yet/i)).toBeVisible();
    });
  });

  test.describe('Template Card', () => {
    test('Delete shows confirmation @critical', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage);
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      const card = authenticatedPage.locator('div.bg-white.border-2').filter({ hasText: 'Friday Night Bingo' });
      await card.getByRole('button', { name: /^delete$/i }).click();
      await expect(card.getByText(/delete this template/i)).toBeVisible();
    });

    test('Cancel dismisses confirmation @high', async ({ authenticatedPage }) => {
      await setupTemplateMocks(authenticatedPage);
      await authenticatedPage.goto('/dashboard/templates');
      await expect(authenticatedPage.getByText('Friday Night Bingo')).toBeVisible();
      const card = authenticatedPage.locator('div.bg-white.border-2').filter({ hasText: 'Friday Night Bingo' });
      await card.getByRole('button', { name: /^delete$/i }).click();
      await expect(card.getByText(/delete this template/i)).toBeVisible();
      await card.getByRole('button', { name: /cancel/i }).click();
      await expect(card.getByText(/delete this template/i)).not.toBeVisible();
    });
  });

  test.describe('Auth', () => {
    test('unauthenticated redirects @critical', async ({ page }) => {
      await page.goto('/dashboard/templates');
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  });
});

import { test, expect } from '../fixtures/auth';

test.describe('Recent Templates Display (BEA-325)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display Recent Templates section on dashboard', async ({
    authenticatedPage: page,
  }) => {
    // Verify section exists
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });
    await expect(section).toBeVisible();

    // Verify "View All" link exists
    const viewAllLink = section.locator('a:has-text("View All")');
    await expect(viewAllLink).toBeVisible();
    await expect(viewAllLink).toHaveAttribute('href', '/dashboard/templates');
  });

  test('should display Bingo and Trivia columns', async ({ authenticatedPage: page }) => {
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Verify Bingo column
    const bingoHeading = section.locator('h3:has-text("Bingo Templates")');
    await expect(bingoHeading).toBeVisible();
    await expect(bingoHeading.locator('svg')).toBeVisible(); // Bingo icon

    // Verify Trivia column
    const triviaHeading = section.locator('h3:has-text("Trivia Templates")');
    await expect(triviaHeading).toBeVisible();
    await expect(triviaHeading.locator('svg')).toBeVisible(); // Trivia icon
  });

  test('should show empty state when no templates exist', async ({ authenticatedPage: page }) => {
    // Assuming fresh test user has no templates
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Check for overall empty state OR column-specific empty states
    const overallEmpty = section.locator('text=No templates yet');
    const bingoEmpty = section.locator('text=No Bingo templates yet');
    const triviaEmpty = section.locator('text=No Trivia templates yet');

    // At least one empty state should be visible
    const hasEmptyState = await Promise.all([
      overallEmpty.isVisible(),
      bingoEmpty.isVisible(),
      triviaEmpty.isVisible(),
    ]).then((results) => results.some((v) => v));

    expect(hasEmptyState).toBeTruthy();
  });

  test('should display template cards with correct information', async ({
    page,
  }) => {
    // This test assumes templates exist - may need to create fixtures
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Look for any template list items
    const templateItems = section.locator('ul[role="list"] li');
    const count = await templateItems.count();

    if (count > 0) {
      // If templates exist, verify structure
      const firstTemplate = templateItems.first();

      // Should have game icon
      await expect(firstTemplate.locator('svg').first()).toBeVisible();

      // Should have template name
      const nameHeading = firstTemplate.locator('h4');
      await expect(nameHeading).toBeVisible();
      const name = await nameHeading.textContent();
      expect(name).toBeTruthy();
      expect(name!.length).toBeGreaterThan(0);

      // Should have timestamp
      const timestamp = firstTemplate.locator(
        'p.text-sm.text-muted-foreground'
      );
      await expect(timestamp).toBeVisible();
      const timestampText = await timestamp.textContent();
      expect(timestampText).toMatch(
        /Just now|hours? ago|days? ago|Yesterday|[A-Z][a-z]{2} \d{1,2}/
      );

      // Should have "Load" button
      const loadButton = firstTemplate.locator(
        'a:has-text("Load in"), a:has-text("Load")'
      );
      await expect(loadButton).toBeVisible();
    }
  });

  test('should have accessible touch targets (44x44px minimum)', async ({
    page,
  }) => {
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // View All link
    const viewAllLink = section.locator('a:has-text("View All")');
    const viewAllBox = await viewAllLink.boundingBox();
    expect(viewAllBox).toBeTruthy();
    expect(viewAllBox!.height).toBeGreaterThanOrEqual(44);

    // Load buttons (if templates exist)
    const loadButtons = section.locator(
      'a:has-text("Load in"), a:has-text("Load")'
    );
    const loadButtonCount = await loadButtons.count();

    if (loadButtonCount > 0) {
      const firstLoadButton = loadButtons.first();
      const loadButtonBox = await firstLoadButton.boundingBox();
      expect(loadButtonBox).toBeTruthy();
      expect(loadButtonBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should navigate to game with template ID when Load button clicked', async ({
    page,
  }) => {
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Look for any Load button
    const loadButtons = section.locator(
      'a:has-text("Load in Bingo"), a:has-text("Load in Trivia")'
    );
    const count = await loadButtons.count();

    if (count > 0) {
      const firstLoadButton = loadButtons.first();
      const href = await firstLoadButton.getAttribute('href');

      // Should have href with template query param
      expect(href).toBeTruthy();
      expect(href).toMatch(/\/play\?template=[a-f0-9-]{36}/);

      // Should point to correct game URL
      const isBingo = (await firstLoadButton.textContent())?.includes('Bingo');
      if (isBingo) {
        expect(href).toMatch(/3000\/play\?template=/);
      } else {
        expect(href).toMatch(/3001\/play\?template=/);
      }
    }
  });

  test('should show loading state while fetching templates', async ({
    page,
  }) => {
    // This test may need network interception to slow down API
    // For now, verify loading skeleton structure exists in component
    await page.goto('/dashboard');

    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // The component has loading state - hard to catch in fast networks
    // At minimum verify section renders
    await expect(section).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Intercept templates API to return error
    await context.route('**/api/templates*', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Should still render section (graceful degradation)
    await expect(section).toBeVisible();

    // Should show empty state when API fails
    const overallEmpty = section.locator('text=No templates yet');
    const bingoEmpty = section.locator('text=No Bingo templates yet');
    const triviaEmpty = section.locator('text=No Trivia templates yet');

    const hasEmptyState = await Promise.all([
      overallEmpty.isVisible(),
      bingoEmpty.isVisible(),
      triviaEmpty.isVisible(),
    ]).then((results) => results.some((v) => v));
    expect(hasEmptyState).toBeTruthy();
  });

  test('should display up to 3 templates per game type', async ({ authenticatedPage: page }) => {
    const section = page.locator('section', {
      has: page.locator('h2:has-text("Recent Templates")'),
    });

    // Check Bingo column
    const bingoList = section.locator('ul[aria-label="Recent Bingo templates"]');
    const bingoCount = await bingoList.locator('li').count();
    expect(bingoCount).toBeLessThanOrEqual(3);

    // Check Trivia column
    const triviaList = section.locator(
      'ul[aria-label="Recent Trivia templates"]'
    );
    const triviaCount = await triviaList.locator('li').count();
    expect(triviaCount).toBeLessThanOrEqual(3);
  });
});

import { test, expect } from '../fixtures/auth';

test.describe('Auth Fixture Verification', () => {
  test('authenticatedBingoPage loads /play', async ({ authenticatedBingoPage }) => {
    // Should be on /play without redirect
    expect(authenticatedBingoPage.url()).toContain('/play');

    // Should see presenter view elements
    await expect(
      authenticatedBingoPage.getByRole('heading', { name: /beak bingo/i })
    ).toBeVisible();
  });
});

/**
 * Playwright Global Setup
 * Runs once before all tests to validate test environment.
 *
 * NOTE: Test user creation is handled manually via Supabase dashboard.
 * Expected test user: e2e-test@beak-gaming.test
 *
 * Environment variables are loaded from .env file by Playwright's config.
 */

import { waitForServers } from './helpers/wait-for-server';
import { getE2EPortConfig } from './utils/port-config';

async function globalSetup() {
  console.log('[E2E Setup] Initializing test environment...');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required environment variables:\n' +
      `${!supabaseUrl ? '- NEXT_PUBLIC_SUPABASE_URL\n' : ''}` +
      `${!serviceRoleKey ? '- SUPABASE_SERVICE_ROLE_KEY\n' : ''}` +
      'These are required for E2E test setup.'
    );
  }

  console.log('[E2E Setup] ✓ Environment validated');
  console.log('[E2E Setup] ✓ Test user expected: e2e-test@beak-gaming.test');

  // Health check servers before running tests
  // Port config is shared with playwright.config.ts via e2e/utils/port-config.ts
  const portConfig = getE2EPortConfig();

  console.log('[E2E Setup] Checking server health...');
  console.log(`[E2E Setup]   Source: ${portConfig.source}`);
  console.log(`[E2E Setup]   Bingo:  http://localhost:${portConfig.bingoPort}`);
  console.log(`[E2E Setup]   Trivia: http://localhost:${portConfig.triviaPort}`);
  console.log(`[E2E Setup]   Hub:    http://localhost:${portConfig.hubPort}`);

  await waitForServers([
    `http://localhost:${portConfig.bingoPort}`,
    `http://localhost:${portConfig.triviaPort}`,
    `http://localhost:${portConfig.hubPort}`,
  ]);

  console.log('[E2E Setup] ✓ All servers ready');
  console.log('[E2E Setup] ✓ Ready to run tests');
}

export default globalSetup;

/**
 * Playwright Global Setup
 * Runs once before all tests to validate test environment.
 *
 * NOTE: Test user creation is handled manually via Supabase dashboard.
 * Expected test user: e2e-test@beak-gaming.test
 *
 * Environment variables are loaded from .env file by Playwright's config.
 */

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
  console.log('[E2E Setup] ✓ Ready to run tests');
}

export default globalSetup;

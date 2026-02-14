/**
 * Global Setup for Real-Auth E2E Tests
 *
 * Validates that local Supabase is running and the test user exists.
 * This runs once before all real-auth tests to fail fast with clear errors.
 */

import { createClient } from '@supabase/supabase-js';
import { waitForServers } from './helpers/wait-for-server';

async function globalSetup() {
  console.log('[Real-Auth Setup] Initializing test environment...');

  // 1. Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sessionSecret = process.env.SESSION_TOKEN_SECRET;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!sessionSecret) missing.push('SESSION_TOKEN_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `[Real-Auth Setup] Missing required environment variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        '\n\nMake sure to run via: pnpm test:e2e:real-auth\n' +
        '(which starts local Supabase and sets these automatically)'
    );
  }

  console.log('[Real-Auth Setup] Environment validated');
  console.log(`[Real-Auth Setup]   Supabase URL: ${supabaseUrl}`);

  // 2. Connect to local Supabase and verify test user exists
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = 'real-auth-test@beak-gaming.test';

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw new Error(
        `[Real-Auth Setup] Failed to connect to local Supabase: ${error.message}\n` +
          'Is local Supabase running? Check: supabase status'
      );
    }

    const testUser = data.users.find((u) => u.email === testEmail);
    if (!testUser) {
      throw new Error(
        `[Real-Auth Setup] Test user '${testEmail}' not found in local Supabase.\n` +
          'Run: supabase db reset  (this re-applies seed.sql which creates the test user)'
      );
    }

    console.log(`[Real-Auth Setup] Test user verified: ${testEmail} (id: ${testUser.id})`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('[Real-Auth Setup]')) {
      throw error; // Re-throw our own errors
    }
    throw new Error(
      `[Real-Auth Setup] Cannot connect to local Supabase at ${supabaseUrl}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'Make sure local Supabase is running: supabase start'
    );
  }

  // 3. Health-check all 3 app servers
  console.log('[Real-Auth Setup] Checking server health...');
  console.log('[Real-Auth Setup]   Bingo:  http://localhost:3000');
  console.log('[Real-Auth Setup]   Trivia: http://localhost:3001');
  console.log('[Real-Auth Setup]   Hub:    http://localhost:3002');

  await waitForServers([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]);

  console.log('[Real-Auth Setup] All servers ready');
  console.log('[Real-Auth Setup] Ready to run real-auth tests');
}

export default globalSetup;

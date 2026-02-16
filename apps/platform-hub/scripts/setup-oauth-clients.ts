/**
 * Setup OAuth Clients for E2E Testing
 *
 * Registers Bingo and Trivia as OAuth clients in Supabase.
 * This script should be run before E2E tests to ensure OAuth clients exist.
 *
 * Usage (from apps/platform-hub):
 *   npx tsx scripts/setup-oauth-clients.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable is required.');
  console.error('   Set it in your .env.local or export it before running this script.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  console.error('   Set it in your .env.local or export it before running this script.');
  console.error('   Get it from: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

// Platform Hub URL - use env var for production, fall back to localhost for E2E/dev
const PLATFORM_HUB_URL = process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';

// OAuth client configurations
const OAUTH_CLIENTS = [
  {
    id: '0d87a03a-d90a-4ccc-a46b-85fdd8d53c21',
    name: 'Beak Bingo',
    redirect_uris: ['http://localhost:3000/auth/callback'],
    consent_page_url: `${PLATFORM_HUB_URL}/oauth/consent`,
  },
  {
    id: '0cd92ba6-459b-4c07-ab9d-b9bf9dbb1936',
    name: 'Beak Trivia',
    redirect_uris: ['http://localhost:3001/auth/callback'],
    consent_page_url: `${PLATFORM_HUB_URL}/oauth/consent`,
  },
];

async function setupOAuthClients() {
  console.log('🔐 Setting up OAuth clients for E2E testing...\n');

  // Create admin client (validated above — process.exit(1) if missing)
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const client of OAUTH_CLIENTS) {
    console.log(`📝 Registering: ${client.name} (${client.id})`);

    try {
      // Check if client already exists
      const { data: existingClients, error: listError } = await (supabase.auth.admin as any).listOAuthClients();

      if (listError) {
        console.error(`   ❌ Failed to list clients:`, listError.message);
        continue;
      }

      const exists = existingClients?.find((c: any) =>
        c.id === client.id || c.client_id === client.id
      );

      if (exists) {
        console.log(`   ✓ Client already exists`);
        console.log(`      - Registered redirect URIs: ${exists.redirect_uris?.join(', ')}`);
        console.log(`      - Consent page: ${exists.consent_page_url || 'not set'}`);
        continue;
      }

      // Create OAuth client
      const { error } = await (supabase.auth.admin as any).createOAuthClient({
        id: client.id,
        name: client.name,
        redirect_uris: client.redirect_uris,
        consent_page_url: client.consent_page_url,
      });

      if (error) {
        console.error(`   ❌ Failed to create client:`, error.message);
        console.error(`      Error details:`, error);
      } else {
        console.log(`   ✓ Client registered successfully`);
        console.log(`      - Redirect URIs: ${client.redirect_uris.join(', ')}`);
        console.log(`      - Consent page: ${client.consent_page_url}`);
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err);
    }

    console.log('');
  }

  console.log('✅ OAuth client setup complete!');
  console.log('\n💡 Next steps:');
  console.log('   - Run E2E tests: npx playwright test e2e/platform-hub/sso-*.spec.ts');
  console.log('   - Or start dev servers and test manually');
}

// Run if executed directly
setupOAuthClients().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { setupOAuthClients };

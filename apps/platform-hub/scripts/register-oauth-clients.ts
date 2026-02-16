/**
 * Register OAuth clients using Supabase Admin API
 *
 * Sets consent_page_url so Supabase redirects users to Platform Hub's
 * OAuth consent page during the authorization flow.
 *
 * Usage:
 *   npx tsx apps/platform-hub/scripts/register-oauth-clients.ts
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL       - Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY      - Service role key (required)
 *   NEXT_PUBLIC_PLATFORM_HUB_URL   - Platform Hub base URL (defaults to http://localhost:3002)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Platform Hub URL - use env var for production, fall back to localhost for E2E/dev
const PLATFORM_HUB_URL = process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function registerClients() {
  console.log('🔧 Registering OAuth Clients\n');
  console.log(`   Platform Hub URL: ${PLATFORM_HUB_URL}`);
  console.log(`   Consent page: ${PLATFORM_HUB_URL}/oauth/consent\n`);

  // Register Bingo
  console.log('📝 Creating Beak Bingo client...');
  const bingoResult = await supabase.auth.admin.oauth.createClient({
    redirect_uris: [
      'http://localhost:3000/auth/callback',
      'https://bingo.beak-gaming.com/auth/callback'
    ],
    consent_page_url: `${PLATFORM_HUB_URL}/oauth/consent`,
    client_type: 'public'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (bingoResult.error) {
    console.error('❌ Bingo error:', bingoResult.error);
    process.exit(1);
  }

  console.log('✅ Bingo Client ID:', bingoResult.data.client_id);
  console.log('');

  // Register Trivia
  console.log('📝 Creating Trivia Night client...');
  const triviaResult = await supabase.auth.admin.oauth.createClient({
    redirect_uris: [
      'http://localhost:3001/auth/callback',
      'https://trivia.beak-gaming.com/auth/callback'
    ],
    consent_page_url: `${PLATFORM_HUB_URL}/oauth/consent`,
    client_type: 'public'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (triviaResult.error) {
    console.error('❌ Trivia error:', triviaResult.error);
    process.exit(1);
  }

  console.log('✅ Trivia Client ID:', triviaResult.data.client_id);
  console.log('');

  // Output summary
  console.log('=====================================');
  console.log('Client IDs:');
  console.log(`Bingo:  ${bingoResult.data.client_id}`);
  console.log(`Trivia: ${triviaResult.data.client_id}`);
  console.log('=====================================');
}

registerClients().catch(console.error);

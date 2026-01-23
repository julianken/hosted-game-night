/**
 * Register OAuth clients using Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function registerClients() {
  console.log('🔧 Registering OAuth Clients\n');

  // Register Bingo
  console.log('📝 Creating Beak Bingo client...');
  const bingoResult = await supabase.auth.admin.oauth.createClient({
    redirect_uris: [
      'http://localhost:3000/auth/callback',
      'https://bingo.beakgaming.com/auth/callback'
    ],
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
      'https://trivia.beakgaming.com/auth/callback'
    ],
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

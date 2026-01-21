#!/usr/bin/env node
/**
 * register-oauth-clients.mjs
 *
 * Registers Bingo and Trivia as OAuth clients in Supabase
 * Uses Supabase Admin API with service role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from platform-hub .env.local
const envPath = join(__dirname, '../apps/platform-hub/.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.error('❌ Error: Cannot read .env.local file at', envPath);
  console.error('   Please ensure apps/platform-hub/.env.local exists');
  process.exit(1);
}

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

console.log('🔧 Supabase OAuth Client Registration');
console.log('=====================================\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', serviceRoleKey.substring(0, 20) + '...\n');

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Register Bingo client
console.log('📝 Registering Beak Bingo OAuth client...');
const bingoResult = await supabase.auth.admin.oauth.createClient({
  name: 'Beak Bingo',
  redirect_uris: [
    'http://localhost:3000/auth/callback',
    'https://bingo.beakgaming.com/auth/callback'
  ],
  client_type: 'public'  // PKCE-based, no client secret
});

if (bingoResult.error) {
  console.error('❌ Error creating Bingo client:', bingoResult.error.message);
  process.exit(1);
}

console.log('✅ Bingo client created successfully!');
console.log('   Client ID:', bingoResult.data.client_id);
console.log('   Client Name:', bingoResult.data.name);
console.log('   Client Type:', bingoResult.data.client_type);
console.log('   Redirect URIs:', bingoResult.data.redirect_uris.join(', '));
console.log('');

// Register Trivia client
console.log('📝 Registering Trivia Night OAuth client...');
const triviaResult = await supabase.auth.admin.oauth.createClient({
  name: 'Trivia Night',
  redirect_uris: [
    'http://localhost:3001/auth/callback',
    'https://trivia.beakgaming.com/auth/callback'
  ],
  client_type: 'public'  // PKCE-based, no client secret
});

if (triviaResult.error) {
  console.error('❌ Error creating Trivia client:', triviaResult.error.message);
  process.exit(1);
}

console.log('✅ Trivia client created successfully!');
console.log('   Client ID:', triviaResult.data.client_id);
console.log('   Client Name:', triviaResult.data.name);
console.log('   Client Type:', triviaResult.data.client_type);
console.log('   Redirect URIs:', triviaResult.data.redirect_uris.join(', '));
console.log('');

// Summary
console.log('=====================================');
console.log('✅ Both OAuth clients registered!\n');
console.log('Next steps:');
console.log('1. Save the following to apps/bingo/.env.local:');
console.log(`   NEXT_PUBLIC_OAUTH_CLIENT_ID=${bingoResult.data.client_id}`);
console.log('');
console.log('2. Save the following to apps/trivia/.env.local:');
console.log(`   NEXT_PUBLIC_OAUTH_CLIENT_ID=${triviaResult.data.client_id}`);
console.log('');
console.log('3. Run: ./scripts/verify-oauth-phase1.sh');
console.log('');

// Export client IDs for automation
console.log('--- Client IDs (JSON) ---');
console.log(JSON.stringify({
  bingo: {
    client_id: bingoResult.data.client_id,
    name: 'Beak Bingo',
    redirect_uris: bingoResult.data.redirect_uris
  },
  trivia: {
    client_id: triviaResult.data.client_id,
    name: 'Trivia Night',
    redirect_uris: triviaResult.data.redirect_uris
  }
}, null, 2));

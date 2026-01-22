/**
 * verify-oauth-sdk.ts
 *
 * Verifies that Supabase OAuth 2.1 SDK methods exist and are callable.
 * Tests the methods we'll use in Phase 2 implementation.
 *
 * Run: npx tsx scripts/verify-oauth-sdk.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const env: Record<string, string> = {};
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
  console.error('\n   Make sure .env.local exists with these variables');
  process.exit(1);
}

console.log('🔍 Supabase OAuth SDK Verification');
console.log('=====================================\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', serviceRoleKey.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('📋 Checking SDK method availability...\n');

// Check if OAuth methods exist
const checks = [
  {
    name: 'supabase.auth.oauth',
    exists: !!supabase.auth.oauth
  },
  {
    name: 'supabase.auth.oauth.getAuthorizationDetails',
    exists: typeof supabase.auth.oauth?.getAuthorizationDetails === 'function'
  },
  {
    name: 'supabase.auth.oauth.approveAuthorization',
    exists: typeof supabase.auth.oauth?.approveAuthorization === 'function'
  },
  {
    name: 'supabase.auth.oauth.denyAuthorization',
    exists: typeof supabase.auth.oauth?.denyAuthorization === 'function'
  }
];

let allPassed = true;

checks.forEach(check => {
  const status = check.exists ? '✅ FOUND' : '❌ MISSING';
  console.log(`${status}: ${check.name}`);
  if (!check.exists) {
    allPassed = false;
  }
});

console.log('');

if (!allPassed) {
  console.error('❌ SDK Verification Failed');
  console.error('   Some OAuth methods are missing from the Supabase SDK.');
  console.error('   This may indicate:');
  console.error('   1. Outdated @supabase/supabase-js version (need v2.45.0+)');
  console.error('   2. OAuth 2.1 server not enabled in Supabase Dashboard');
  console.error('   3. Project tier does not support OAuth server');
  console.error('');
  console.error('   Next steps:');
  console.error('   - Check @supabase/supabase-js version: pnpm list @supabase/supabase-js');
  console.error('   - Verify OAuth server is enabled in Supabase Dashboard');
  console.error('   - Review Phase 1 completion status');
  process.exit(1);
}

console.log('✅ All OAuth SDK methods found!\n');

// Test method signatures with mock authorization_id
console.log('📋 Testing method signatures...\n');

async function testMethods() {
  console.log('Testing getAuthorizationDetails with mock ID...');
  try {
    const mockAuthId = 'test-authorization-id-12345';
    const result = await supabase.auth.oauth.getAuthorizationDetails(mockAuthId);

    // We expect this to fail (invalid ID), but we're checking the response structure
    if (result.error) {
      console.log('   ✅ Method callable - returns { data, error } structure');
      console.log(`   📝 Error response: ${result.error.message || (result.error as any).error_description || JSON.stringify(result.error)}`);
      console.log('   ℹ️  This is expected for a mock authorization ID');
    } else if (result.data) {
      console.log('   ⚠️  Unexpected: Got data for mock ID');
      console.log('   📝 Data structure:', Object.keys(result.data));
    }
  } catch (error: any) {
    console.error('   ❌ Method threw exception:', error.message);
    allPassed = false;
  }

  console.log('');

  // Check if we can see the structure
  console.log('📋 Method Structure Analysis...\n');
  console.log('getAuthorizationDetails signature:');
  console.log('  - Type:', typeof supabase.auth.oauth.getAuthorizationDetails);
  console.log('  - Length (params):', supabase.auth.oauth.getAuthorizationDetails.length);

  console.log('\napproveAuthorization signature:');
  console.log('  - Type:', typeof supabase.auth.oauth.approveAuthorization);
  console.log('  - Length (params):', supabase.auth.oauth.approveAuthorization.length);

  console.log('\ndenyAuthorization signature:');
  console.log('  - Type:', typeof supabase.auth.oauth.denyAuthorization);
  console.log('  - Length (params):', supabase.auth.oauth.denyAuthorization.length);

  console.log('');

  // Check package version
  try {
    const pkgJsonPath = resolve(__dirname, '../../../node_modules/@supabase/supabase-js/package.json');
    const pkgJsonContent = readFileSync(pkgJsonPath, 'utf-8');
    const packageJson = JSON.parse(pkgJsonContent);
    console.log('📦 Package Information:\n');
    console.log('  - @supabase/supabase-js version:', packageJson.version);
    console.log('  - Required version: >=2.45.0 (OAuth support added)');

    const versionParts = packageJson.version.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];

    const versionOk = major > 2 || (major === 2 && minor >= 45);
    console.log('  - Version check:', versionOk ? '✅ Compatible' : '⚠️  May need upgrade');
  } catch {
    console.log('📦 Package version check skipped (could not read package.json)');
  }

  console.log('');

  if (allPassed) {
    console.log('=====================================');
    console.log('✅ SDK Verification PASSED');
    console.log('=====================================\n');
    console.log('Phase 2 can proceed with implementation.');
    console.log('All required Supabase OAuth methods are available.\n');
    console.log('Expected method behavior:');
    console.log('  - getAuthorizationDetails(id) → { data: { client, scopes, user, redirect_uri? }, error }');
    console.log('  - approveAuthorization(id) → { data: { redirect_to }, error }');
    console.log('  - denyAuthorization(id) → { data: { redirect_to }, error }');
    console.log('');
    process.exit(0);
  } else {
    console.log('=====================================');
    console.log('❌ SDK Verification FAILED');
    console.log('=====================================\n');
    console.log('Please resolve the issues above before proceeding.\n');
    process.exit(1);
  }
}

testMethods();

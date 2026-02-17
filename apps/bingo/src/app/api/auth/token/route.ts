import { createTokenHandler } from '@joolie-boolie/auth/api';

export const POST = createTokenHandler({
  platformHubUrl: process.env.NEXT_PUBLIC_PLATFORM_HUB_URL || 'http://localhost:3002',
  clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
  redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!,
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
});

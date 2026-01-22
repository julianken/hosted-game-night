/**
 * CSRF Token Generation API
 *
 * GET /api/oauth/csrf
 *
 * Generates a CSRF token for OAuth consent forms.
 * Token is stored in httpOnly cookie and returned in response.
 *
 * Response:
 * {
 *   token: string;  // Base64-encoded CSRF token
 * }
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfToken } from '@/lib/csrf';

export async function GET() {
  try {
    // Generate new CSRF token
    const token = generateCsrfToken();

    // Store in httpOnly cookie
    await setCsrfToken(token);

    // Return token to client (needed for form submission)
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);

    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import type { TypedSupabaseClient } from '../client';
import {
  createGameSession,
  getGameSessionByRoomCode,
  updateGameSessionState,
  incrementFailedPinAttempt,
  resetFailedPinAttempts,
  markSessionCompleted,
} from '../tables/persistent-sessions';
import {
  createPinHash,
  verifyPin,
  isValidPin,
  isLockedOut,
  MAX_ATTEMPTS,
} from '../pin-security';
import {
  createSessionToken,
  isTokenExpired,
} from '../session-token';
import { signToken, verifyAndDecodeToken } from '../hmac-tokens';
import { generateSessionId } from '../tables/game-sessions';

/**
 * Configuration for session route handlers
 */
export interface SessionRouteConfig {
  /** Game type (bingo or trivia) */
  gameType: 'bingo' | 'trivia';
  /** Function to create Supabase client */
  createClient: () => Promise<TypedSupabaseClient>;
  /** Optional game-specific state validation */
  validateGameState?: (state: unknown) => boolean;
  /**
   * Optional authentication function for session creation.
   * When provided, the POST handler will require authentication.
   * Should return a user object if authenticated, or null if not.
   */
  authenticateRequest?: (request: NextRequest) => Promise<{ id: string; email: string } | null>;
}

/**
 * Factory function that creates session route handlers for a game
 *
 * This eliminates code duplication between bingo and trivia apps by providing
 * a shared implementation of all session management routes.
 *
 * @param config - Configuration for the route handlers
 * @returns Object containing route handler functions
 */
export function createSessionRoutes(config: SessionRouteConfig) {
  const { gameType, createClient, validateGameState, authenticateRequest } = config;

  /**
   * POST /api/sessions - Create new session
   *
   * Creates a new game session with PIN protection and returns a signed token.
   * Requires authentication when authenticateRequest is configured.
   */
  const POST = async (request: NextRequest) => {
    try {
      // Verify authentication if auth function is provided
      if (authenticateRequest) {
        const user = await authenticateRequest(request);
        if (!user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }

      const client = await createClient();
      const body = await request.json();

      // Validate PIN format
      if (!isValidPin(body.pin)) {
        return NextResponse.json(
          { error: 'PIN must be 4-6 digits' },
          { status: 400 }
        );
      }

      // Validate SESSION_TOKEN_SECRET env var
      if (!process.env.SESSION_TOKEN_SECRET) {
        console.error('SESSION_TOKEN_SECRET environment variable not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Hash PIN
      const { hash, salt } = await createPinHash(body.pin);

      // Retry logic for handling room code collisions during parallel execution
      // PostgreSQL error 23505 (unique constraint violation) can occur when
      // multiple tests/requests generate the same room code simultaneously
      const MAX_RETRIES = 3;
      let session;
      let lastError;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Generate room code using database function
          const { data: roomCode, error: rpcError } = await client
            .rpc('generate_room_code');

          if (rpcError || !roomCode) {
            console.error('Failed to generate room code:', rpcError);
            return NextResponse.json(
              { error: 'Failed to generate room code' },
              { status: 500 }
            );
          }

          // Create session
          session = await createGameSession(client, {
            room_code: roomCode,
            session_id: generateSessionId(),
            game_type: gameType,
            pin_hash: hash,
            pin_salt: salt,
            game_state: body.initialState || {},
            status: 'active',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          });

          // Success - break out of retry loop
          break;
        } catch (error: unknown) {
          lastError = error;
          // Check if this is a duplicate key error (PostgreSQL error code 23505)
          const isDuplicateError =
            error &&
            typeof error === 'object' &&
            'code' in error &&
            (error.code === 'DUPLICATE' || error.code === '23505');

          // If it's a duplicate key error and we have retries left, try again
          if (isDuplicateError && attempt < MAX_RETRIES - 1) {
            console.warn(`Room code collision detected (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`);
            continue;
          }

          // Otherwise, throw the error to be caught by outer try-catch
          throw error;
        }
      }

      // If session wasn't created after retries, throw the last error
      if (!session) {
        throw lastError || new Error('Failed to create session after retries');
      }

      // Create HMAC-signed token
      const token = createSessionToken(
        session.session_id,
        session.room_code,
        gameType
      );
      const signedToken = await signToken(token, process.env.SESSION_TOKEN_SECRET);

      return NextResponse.json({
        data: {
          session: {
            roomCode: session.room_code,
            sessionId: session.session_id,
            gameType: session.game_type,
            status: session.status,
          },
          sessionToken: signedToken,
        },
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
  };

  /**
   * GET /api/sessions/[roomCode] - Get public session state
   *
   * Returns public session data without PIN information.
   * Used by audience displays to show game state.
   */
  const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ roomCode: string }> }
  ) => {
    try {
      const { roomCode } = await params;
      const client = await createClient();

      const session = await getGameSessionByRoomCode(client, roomCode);

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Return public data only (no PIN info)
      return NextResponse.json({
        data: {
          roomCode: session.room_code,
          gameType: session.game_type,
          status: session.status,
          gameState: session.game_state,
          lastSyncAt: session.last_sync_at,
          sequenceNumber: session.sequence_number || 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      );
    }
  };

  /**
   * POST /api/sessions/[roomCode]/verify-pin - Verify PIN and get token
   *
   * Verifies presenter PIN and returns session token on success.
   * Implements lockout after 5 failed attempts.
   */
  const verifyPinHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ roomCode: string }> }
  ) => {
    try {
      const { roomCode } = await params;
      const { pin } = await request.json();
      const client = await createClient();

      // Validate SESSION_TOKEN_SECRET env var
      if (!process.env.SESSION_TOKEN_SECRET) {
        console.error('SESSION_TOKEN_SECRET environment variable not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const session = await getGameSessionByRoomCode(client, roomCode);

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Check lockout
      const lastFailedDate = session.last_failed_attempt_at
        ? new Date(session.last_failed_attempt_at)
        : null;

      if (isLockedOut(session.failed_pin_attempts, lastFailedDate)) {
        return NextResponse.json(
          { error: 'Too many failed attempts. Try again in 15 minutes.' },
          { status: 429 }
        );
      }

      // Verify PIN
      const isValid = await verifyPin(pin, session.pin_hash, session.pin_salt);

      if (!isValid) {
        await incrementFailedPinAttempt(client, roomCode);
        const remainingAttempts = MAX_ATTEMPTS - (session.failed_pin_attempts + 1);
        return NextResponse.json(
          { error: `Incorrect PIN. ${remainingAttempts} attempts remaining.` },
          { status: 401 }
        );
      }

      // Reset failed attempts on successful verification
      await resetFailedPinAttempts(client, roomCode);

      // Create HMAC-signed token
      const token = createSessionToken(
        session.session_id,
        session.room_code,
        gameType
      );
      const signedToken = await signToken(token, process.env.SESSION_TOKEN_SECRET);

      return NextResponse.json({
        data: {
          sessionToken: signedToken,
          gameState: session.game_state,
        },
      });
    } catch (error) {
      console.error('PIN verification failed:', error);
      return NextResponse.json(
        { error: 'PIN verification failed' },
        { status: 500 }
      );
    }
  };

  /**
   * PATCH /api/sessions/[roomCode]/state - Update game state
   *
   * Updates session game state. Requires valid HMAC-signed token.
   */
  const updateState = async (
    request: NextRequest,
    { params }: { params: Promise<{ roomCode: string }> }
  ) => {
    try {
      const { roomCode } = await params;
      const { sessionToken, state } = await request.json();
      const client = await createClient();

      // Validate SESSION_TOKEN_SECRET env var
      if (!process.env.SESSION_TOKEN_SECRET) {
        console.error('SESSION_TOKEN_SECRET environment variable not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Verify HMAC-signed token
      const token = await verifyAndDecodeToken(
        sessionToken,
        process.env.SESSION_TOKEN_SECRET
      );

      if (!token || isTokenExpired(token) || token.roomCode !== roomCode) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Optional game-specific validation
      if (validateGameState && !validateGameState(state)) {
        return NextResponse.json(
          { error: 'Invalid game state' },
          { status: 400 }
        );
      }

      // Update session
      const updatedSession = await updateGameSessionState(client, roomCode, state);

      return NextResponse.json({
        data: {
          roomCode: updatedSession.room_code,
          lastSyncAt: updatedSession.last_sync_at,
          sequenceNumber: updatedSession.sequence_number || 0,
        },
      });
    } catch (error) {
      console.error('Failed to update state:', error);
      return NextResponse.json(
        { error: 'Failed to update state' },
        { status: 500 }
      );
    }
  };

  /**
   * POST /api/sessions/[roomCode]/complete - Mark session complete
   *
   * Marks session as completed. Requires valid HMAC-signed token.
   */
  const complete = async (
    request: NextRequest,
    { params }: { params: Promise<{ roomCode: string }> }
  ) => {
    try {
      const { roomCode } = await params;
      const { sessionToken } = await request.json();
      const client = await createClient();

      // Validate SESSION_TOKEN_SECRET env var
      if (!process.env.SESSION_TOKEN_SECRET) {
        console.error('SESSION_TOKEN_SECRET environment variable not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Verify HMAC-signed token
      const token = await verifyAndDecodeToken(
        sessionToken,
        process.env.SESSION_TOKEN_SECRET
      );

      if (!token || isTokenExpired(token) || token.roomCode !== roomCode) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Mark complete
      await markSessionCompleted(client, roomCode);

      return NextResponse.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to complete session:', error);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }
  };

  return {
    POST,
    GET,
    verifyPin: verifyPinHandler,
    updateState,
    complete,
  };
}

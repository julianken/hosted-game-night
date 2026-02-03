/**
 * Tests for session routes factory
 *
 * These tests verify the route handlers created by createSessionRoutes(),
 * including PIN validation, HMAC token authentication, and session management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionRoutes } from '../session-routes';
import type { TypedSupabaseClient } from '../../client';
import type { GameSession } from '../../types';

// Mock dependencies
vi.mock('../../tables/persistent-sessions');
vi.mock('../../pin-security');
vi.mock('../../session-token');
vi.mock('../../hmac-tokens');
vi.mock('../../tables/game-sessions');

// Import mocked modules
import * as persistentSessions from '../../tables/persistent-sessions';
import * as pinSecurity from '../../pin-security';
import * as sessionToken from '../../session-token';
import * as hmacTokens from '../../hmac-tokens';
import * as gameSessions from '../../tables/game-sessions';

describe('createSessionRoutes', () => {
  let mockClient: TypedSupabaseClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    process.env.SESSION_TOKEN_SECRET = 'test-secret-key-minimum-32-chars-long-for-testing!!';

    // Mock Supabase client
    mockClient = {
      rpc: vi.fn().mockResolvedValue({ data: 'TEST123', error: null }),
      from: vi.fn(),
      auth: {},
    } as unknown as TypedSupabaseClient;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe('POST /api/sessions - Create session', () => {
    it('should create new session with valid PIN', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      // Mock PIN hashing
      vi.mocked(pinSecurity.isValidPin).mockReturnValue(true);
      vi.mocked(pinSecurity.createPinHash).mockResolvedValue({
        hash: 'hashed-pin',
        salt: 'salt-value',
      });

      // Mock session ID generation
      vi.mocked(gameSessions.generateSessionId).mockReturnValue('sess_test123');

      // Mock session creation
      const mockSession: GameSession = {
        id: 'uuid-123',
        room_code: 'TEST123',
        session_id: 'sess_test123',
        game_type: 'bingo',
        template_id: null,
        preset_id: null,
        question_set_id: null,
        pin_hash: 'hashed-pin',
        pin_salt: 'salt-value',
        failed_pin_attempts: 0,
        last_failed_attempt_at: null,
        status: 'active',
        game_state: {},
        user_id: null,
        last_sync_at: new Date().toISOString(),
        sequence_number: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      vi.mocked(persistentSessions.createGameSession).mockResolvedValue(mockSession);

      // Mock token creation
      vi.mocked(sessionToken.createSessionToken).mockReturnValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(hmacTokens.signToken).mockResolvedValue('signed-token');

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ pin: '1234', initialState: { test: true } }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.session.roomCode).toBe('TEST123');
      expect(data.data.sessionToken).toBe('signed-token');
      expect(persistentSessions.createGameSession).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          room_code: 'TEST123',
          session_id: 'sess_test123',
          game_type: 'bingo',
          pin_hash: 'hashed-pin',
          pin_salt: 'salt-value',
          game_state: { test: true },
          status: 'active',
        })
      );
    });

    it('should reject invalid PIN format', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(pinSecurity.isValidPin).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ pin: '12' }),  // Too short
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('PIN must be 4-6 digits');
    });

    it('should return 500 if SESSION_TOKEN_SECRET not set', async () => {
      delete process.env.SESSION_TOKEN_SECRET;

      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(pinSecurity.isValidPin).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ pin: '1234' }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Server configuration error');
    });

    it('should handle room code generation failure', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(pinSecurity.isValidPin).mockReturnValue(true);
      vi.mocked(mockClient.rpc).mockResolvedValue({
        data: null,
        error: {
          message: 'RPC failed',
          details: '',
          hint: '',
          code: '500',
          name: 'PostgrestError'
        },
        count: null,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ pin: '1234' }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to generate room code');
    });
  });

  describe('GET /api/sessions/[roomCode] - Get session state', () => {
    it('should return public session data', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      const mockSession: GameSession = {
        id: 'uuid-123',
        room_code: 'TEST123',
        session_id: 'sess_test123',
        game_type: 'bingo',
        template_id: null,
        preset_id: null,
        question_set_id: null,
        pin_hash: 'hashed-pin',  // Should NOT be returned
        pin_salt: 'salt-value',  // Should NOT be returned
        failed_pin_attempts: 0,
        last_failed_attempt_at: null,
        status: 'active',
        game_state: { currentBall: 'B5' },
        user_id: null,
        last_sync_at: '2024-01-01T00:00:00.000Z',
        sequence_number: 5,
        expires_at: '2024-01-02T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/sessions/TEST123');
      const response = await routes.GET(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.roomCode).toBe('TEST123');
      expect(data.data.gameType).toBe('bingo');
      expect(data.data.gameState).toEqual({ currentBall: 'B5' });
      expect(data.data.sequenceNumber).toBe(5);
      expect(data.data).not.toHaveProperty('pin_hash');
      expect(data.data).not.toHaveProperty('pin_salt');
    });

    it('should return 404 for non-existent session', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sessions/INVALID');
      const response = await routes.GET(request, {
        params: Promise.resolve({ roomCode: 'INVALID' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Session not found');
    });
  });

  describe('POST /api/sessions/[roomCode]/verify-pin - Verify PIN', () => {
    const mockSession: GameSession = {
      id: 'uuid-123',
      room_code: 'TEST123',
      session_id: 'sess_test123',
      game_type: 'bingo',
      template_id: null,
      preset_id: null,
      question_set_id: null,
      pin_hash: 'hashed-pin',
      pin_salt: 'salt-value',
      failed_pin_attempts: 0,
      last_failed_attempt_at: null,
      status: 'active',
      game_state: { currentBall: 'B5' },
      user_id: null,
      last_sync_at: '2024-01-01T00:00:00.000Z',
      sequence_number: 0,
      expires_at: '2024-01-02T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    it('should return token for valid PIN', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
      vi.mocked(pinSecurity.isLockedOut).mockReturnValue(false);
      vi.mocked(pinSecurity.verifyPin).mockResolvedValue(true);
      vi.mocked(sessionToken.createSessionToken).mockReturnValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(hmacTokens.signToken).mockResolvedValue('signed-token');

      const request = new NextRequest('http://localhost/api/sessions/TEST123/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: '1234' }),
      });

      const response = await routes.verifyPin(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sessionToken).toBe('signed-token');
      expect(data.data.gameState).toEqual({ currentBall: 'B5' });
      expect(persistentSessions.resetFailedPinAttempts).toHaveBeenCalledWith(mockClient, 'TEST123');
    });

    it('should increment failed attempts for wrong PIN', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(mockSession);
      vi.mocked(pinSecurity.isLockedOut).mockReturnValue(false);
      vi.mocked(pinSecurity.verifyPin).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: '9999' }),
      });

      const response = await routes.verifyPin(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Incorrect PIN');
      expect(persistentSessions.incrementFailedPinAttempt).toHaveBeenCalledWith(mockClient, 'TEST123');
    });

    it('should enforce lockout after 5 failed attempts', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      const lockedSession = {
        ...mockSession,
        failed_pin_attempts: 5,
        last_failed_attempt_at: new Date().toISOString(),
      };

      vi.mocked(persistentSessions.getGameSessionByRoomCode).mockResolvedValue(lockedSession);
      vi.mocked(pinSecurity.isLockedOut).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: '1234' }),
      });

      const response = await routes.verifyPin(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many failed attempts');
      expect(pinSecurity.verifyPin).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/sessions/[roomCode]/state - Update state', () => {
    it('should update game state with valid token', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      const mockUpdatedSession: GameSession = {
        id: 'uuid-123',
        room_code: 'TEST123',
        session_id: 'sess_test123',
        game_type: 'bingo',
        template_id: null,
        preset_id: null,
        question_set_id: null,
        pin_hash: 'hashed-pin',
        pin_salt: 'salt-value',
        failed_pin_attempts: 0,
        last_failed_attempt_at: null,
        status: 'active',
        game_state: { currentBall: 'I20' },
        user_id: null,
        last_sync_at: '2024-01-01T00:01:00.000Z',
        sequence_number: 1,
        expires_at: '2024-01-02T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:01:00.000Z',
      };

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(sessionToken.isTokenExpired).mockReturnValue(false);
      vi.mocked(persistentSessions.updateGameSessionState).mockResolvedValue(mockUpdatedSession);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/state', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionToken: 'valid-signed-token',
          state: { currentBall: 'I20' },
        }),
      });

      const response = await routes.updateState(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.roomCode).toBe('TEST123');
      expect(data.data.sequenceNumber).toBe(1);
      expect(persistentSessions.updateGameSessionState).toHaveBeenCalledWith(
        mockClient,
        'TEST123',
        { currentBall: 'I20' }
      );
    });

    it('should reject expired token', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() - 1000,  // Expired
      });
      vi.mocked(sessionToken.isTokenExpired).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/state', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionToken: 'expired-token',
          state: { currentBall: 'I20' },
        }),
      });

      const response = await routes.updateState(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid or expired token');
    });

    it('should reject token for wrong room code', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue({
        sessionId: 'sess_test123',
        roomCode: 'WRONG123',  // Different room code
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(sessionToken.isTokenExpired).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/state', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionToken: 'wrong-room-token',
          state: { currentBall: 'I20' },
        }),
      });

      const response = await routes.updateState(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid or expired token');
    });

    it('should reject invalid game state if validator provided', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
        validateGameState: (state: unknown) => {
          return typeof state === 'object' && state !== null && 'currentBall' in state;
        },
      });

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(sessionToken.isTokenExpired).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/state', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionToken: 'valid-token',
          state: { invalidField: true },  // Missing currentBall
        }),
      });

      const response = await routes.updateState(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid game state');
    });
  });

  describe('POST /api/sessions/[roomCode]/complete - Mark complete', () => {
    it('should mark session as completed with valid token', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue({
        sessionId: 'sess_test123',
        roomCode: 'TEST123',
        gameType: 'bingo',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      vi.mocked(sessionToken.isTokenExpired).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/sessions/TEST123/complete', {
        method: 'POST',
        body: JSON.stringify({ sessionToken: 'valid-token' }),
      });

      const response = await routes.complete(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
      expect(persistentSessions.markSessionCompleted).toHaveBeenCalledWith(mockClient, 'TEST123');
    });

    it('should reject completion with invalid token', async () => {
      const routes = createSessionRoutes({
        gameType: 'bingo',
        createClient: async () => mockClient,
      });

      vi.mocked(hmacTokens.verifyAndDecodeToken).mockResolvedValue(null);  // Invalid token

      const request = new NextRequest('http://localhost/api/sessions/TEST123/complete', {
        method: 'POST',
        body: JSON.stringify({ sessionToken: 'invalid-token' }),
      });

      const response = await routes.complete(request, {
        params: Promise.resolve({ roomCode: 'TEST123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid or expired token');
      expect(persistentSessions.markSessionCompleted).not.toHaveBeenCalled();
    });
  });
});

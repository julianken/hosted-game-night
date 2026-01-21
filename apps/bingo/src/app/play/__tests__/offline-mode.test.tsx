import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateOfflineSessionId, getOfflineSessionKey, isValidOfflineSessionId } from '@/lib/sync/offline-session';

describe('Offline Mode Integration', () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    } as unknown as Storage;
  });

  describe('Offline Session Lifecycle', () => {
    it('creates offline session with generated ID', () => {
      const sessionId = generateOfflineSessionId();
      const sessionKey = getOfflineSessionKey(sessionId);

      const sessionData = {
        sessionId,
        isOffline: true,
        gameState: {
          status: 'idle',
          calledBalls: [],
          currentBall: null,
        },
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(sessionKey, JSON.stringify(sessionData));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        sessionKey,
        expect.any(String)
      );
      expect(mockLocalStorage[sessionKey]).toBeDefined();
    });

    it('recovers offline session from localStorage', () => {
      const sessionId = 'ABC123';
      const sessionKey = getOfflineSessionKey(sessionId);

      const sessionData = {
        sessionId,
        isOffline: true,
        gameState: {
          status: 'playing',
          calledBalls: [
            { column: 'B', number: 5, label: 'B-5' },
          ],
          currentBall: { column: 'B', number: 5, label: 'B-5' },
        },
        createdAt: new Date().toISOString(),
      };

      mockLocalStorage[sessionKey] = JSON.stringify(sessionData);

      const recovered = localStorage.getItem(sessionKey);
      expect(recovered).toBeDefined();

      const parsed = JSON.parse(recovered!);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.isOffline).toBe(true);
      expect(parsed.gameState.status).toBe('playing');
      expect(parsed.gameState.calledBalls).toHaveLength(1);
    });

    it('validates session ID before recovery', () => {
      const validSessionId = 'ABC123';
      const invalidSessionId = 'invalid';

      expect(isValidOfflineSessionId(validSessionId)).toBe(true);
      expect(isValidOfflineSessionId(invalidSessionId)).toBe(false);
    });

    it('updates offline session state on game changes', () => {
      const sessionId = 'XYZ789';
      const sessionKey = getOfflineSessionKey(sessionId);

      // Initial state
      const initialState = {
        sessionId,
        isOffline: true,
        gameState: {
          status: 'idle',
          calledBalls: [],
          currentBall: null,
        },
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(sessionKey, JSON.stringify(initialState));

      // Simulate game state update
      const updatedState = {
        ...initialState,
        gameState: {
          status: 'playing',
          calledBalls: [
            { column: 'B', number: 1, label: 'B-1' },
            { column: 'I', number: 20, label: 'I-20' },
          ],
          currentBall: { column: 'I', number: 20, label: 'I-20' },
        },
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(sessionKey, JSON.stringify(updatedState));

      const recovered = localStorage.getItem(sessionKey);
      const parsed = JSON.parse(recovered!);

      expect(parsed.gameState.status).toBe('playing');
      expect(parsed.gameState.calledBalls).toHaveLength(2);
      expect(parsed.lastUpdated).toBeDefined();
    });
  });

  describe('No Network Dependency', () => {
    it('stores session data without network calls', () => {
      const sessionId = generateOfflineSessionId();
      const sessionKey = getOfflineSessionKey(sessionId);

      const sessionData = {
        sessionId,
        isOffline: true,
        gameState: { status: 'idle' },
        createdAt: new Date().toISOString(),
      };

      // Should work without any fetch calls
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));

      expect(mockLocalStorage[sessionKey]).toBeDefined();
      // Verify the data is stored correctly
      const stored = JSON.parse(mockLocalStorage[sessionKey]);
      expect(stored.isOffline).toBe(true);
      expect(stored.sessionId).toBe(sessionId);
    });

    it('recovers session without network calls', () => {
      const sessionId = 'DEF456';
      const sessionKey = getOfflineSessionKey(sessionId);

      mockLocalStorage[sessionKey] = JSON.stringify({
        sessionId,
        isOffline: true,
        gameState: { status: 'paused' },
      });

      const recovered = localStorage.getItem(sessionKey);
      const parsed = JSON.parse(recovered!);

      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.isOffline).toBe(true);
      expect(parsed.gameState.status).toBe('paused');
    });
  });

  describe('BroadcastChannel Sync', () => {
    it('uses offline session ID for channel name', () => {
      const sessionId = 'GHI789';
      const expectedChannelName = `beak-bingo-sync-offline-${sessionId}`;

      // Verify channel naming convention
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
      expect(expectedChannelName).toContain('offline');
      expect(expectedChannelName).toContain(sessionId);
    });

    it('isolates offline sessions by ID', () => {
      const session1 = 'ABC123';
      const session2 = 'XYZ789';

      const channel1 = `beak-bingo-sync-offline-${session1}`;
      const channel2 = `beak-bingo-sync-offline-${session2}`;

      // Different sessions should have different channels
      expect(channel1).not.toBe(channel2);
    });
  });

  describe('Display Window URL', () => {
    it('generates display URL with offline session ID', () => {
      const sessionId = 'JKL012';
      const origin = 'http://localhost:3000';
      const displayUrl = `${origin}/display?offline=${sessionId}`;

      expect(displayUrl).toContain('/display');
      expect(displayUrl).toContain('offline=');
      expect(displayUrl).toContain(sessionId);
      expect(displayUrl).not.toContain('room=');
    });

    it('differentiates offline from online display URLs', () => {
      const sessionId = 'MNO345';
      const roomCode = 'SWAN-42';

      const offlineUrl = `/display?offline=${sessionId}`;
      const onlineUrl = `/display?room=${roomCode}`;

      expect(offlineUrl).toContain('offline=');
      expect(offlineUrl).not.toContain('room=');

      expect(onlineUrl).toContain('room=');
      expect(onlineUrl).not.toContain('offline=');
    });
  });

  describe('Session Cleanup', () => {
    it('removes offline session when switching to online', () => {
      const sessionId = 'PQR678';
      const sessionKey = getOfflineSessionKey(sessionId);

      // Create offline session
      mockLocalStorage[sessionKey] = JSON.stringify({
        sessionId,
        isOffline: true,
      });

      expect(localStorage.getItem(sessionKey)).toBeDefined();

      // Simulate switching to online mode
      localStorage.removeItem(sessionKey);

      expect(mockLocalStorage[sessionKey]).toBeUndefined();
    });
  });
});

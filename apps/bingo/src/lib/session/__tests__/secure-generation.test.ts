import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSecurePin,
  generateShortSessionId,
  storePin,
  getStoredPin,
  clearStoredPin,
  storeOfflineSessionId,
  getStoredOfflineSessionId,
  clearStoredOfflineSessionId,
} from '../secure-generation';

describe('generateSecurePin', () => {
  it('should generate a 4-digit PIN', () => {
    const pin = generateSecurePin();
    expect(pin).toMatch(/^\d{4}$/);
  });

  it('should generate a PIN in the range 1000-9999', () => {
    const pin = generateSecurePin();
    const pinNumber = parseInt(pin, 10);
    expect(pinNumber).toBeGreaterThanOrEqual(1000);
    expect(pinNumber).toBeLessThanOrEqual(9999);
  });

  it('should generate different PINs on multiple calls', () => {
    const pins = new Set();
    for (let i = 0; i < 100; i++) {
      pins.add(generateSecurePin());
    }
    // With 9000 possible values, 100 calls should produce at least 95 unique values
    expect(pins.size).toBeGreaterThan(95);
  });

  it('should use crypto.getRandomValues', () => {
    const cryptoSpy = vi.spyOn(crypto, 'getRandomValues');
    generateSecurePin();
    expect(cryptoSpy).toHaveBeenCalled();
    cryptoSpy.mockRestore();
  });

  it('should not use Math.random', () => {
    const mathSpy = vi.spyOn(Math, 'random');
    generateSecurePin();
    expect(mathSpy).not.toHaveBeenCalled();
    mathSpy.mockRestore();
  });
});

describe('generateShortSessionId', () => {
  it('should generate a 6-character session ID', () => {
    const sessionId = generateShortSessionId();
    expect(sessionId).toHaveLength(6);
  });

  it('should generate alphanumeric session IDs', () => {
    const sessionId = generateShortSessionId();
    expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should not contain ambiguous characters (0, O, 1, I)', () => {
    for (let i = 0; i < 100; i++) {
      const sessionId = generateShortSessionId();
      expect(sessionId).not.toMatch(/[0O1I]/);
    }
  });

  it('should generate different session IDs on multiple calls', () => {
    const sessionIds = new Set();
    for (let i = 0; i < 100; i++) {
      sessionIds.add(generateShortSessionId());
    }
    // With 32^6 possible values, 100 calls should produce at least 99 unique values
    expect(sessionIds.size).toBeGreaterThan(98);
  });

  it('should use crypto.getRandomValues', () => {
    const cryptoSpy = vi.spyOn(crypto, 'getRandomValues');
    generateShortSessionId();
    expect(cryptoSpy).toHaveBeenCalled();
    cryptoSpy.mockRestore();
  });

  it('should not use Math.random', () => {
    const mathSpy = vi.spyOn(Math, 'random');
    generateShortSessionId();
    expect(mathSpy).not.toHaveBeenCalled();
    mathSpy.mockRestore();
  });
});

describe('localStorage PIN helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('storePin', () => {
    it('should store a PIN in localStorage', () => {
      const pin = '1234';
      storePin(pin);
      expect(localStorage.getItem('bingo_pin')).toBe(pin);
    });

    it('should overwrite existing PIN', () => {
      storePin('1234');
      storePin('5678');
      expect(localStorage.getItem('bingo_pin')).toBe('5678');
    });
  });

  describe('getStoredPin', () => {
    it('should retrieve a stored PIN', () => {
      localStorage.setItem('bingo_pin', '1234');
      expect(getStoredPin()).toBe('1234');
    });

    it('should return null if no PIN is stored', () => {
      expect(getStoredPin()).toBeNull();
    });

    it('should handle undefined gracefully', () => {
      expect(getStoredPin()).toBeNull();
    });
  });

  describe('clearStoredPin', () => {
    it('should clear a stored PIN', () => {
      localStorage.setItem('bingo_pin', '1234');
      clearStoredPin();
      expect(localStorage.getItem('bingo_pin')).toBeNull();
    });

    it('should not throw if no PIN is stored', () => {
      expect(() => clearStoredPin()).not.toThrow();
    });
  });
});

describe('localStorage offline session ID helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('storeOfflineSessionId', () => {
    it('should store an offline session ID in localStorage', () => {
      const sessionId = 'ABC123';
      storeOfflineSessionId(sessionId);
      expect(localStorage.getItem('bingo_offline_session_id')).toBe(sessionId);
    });

    it('should overwrite existing offline session ID', () => {
      storeOfflineSessionId('ABC123');
      storeOfflineSessionId('XYZ789');
      expect(localStorage.getItem('bingo_offline_session_id')).toBe('XYZ789');
    });
  });

  describe('getStoredOfflineSessionId', () => {
    it('should retrieve a stored offline session ID', () => {
      localStorage.setItem('bingo_offline_session_id', 'ABC123');
      expect(getStoredOfflineSessionId()).toBe('ABC123');
    });

    it('should return null if no offline session ID is stored', () => {
      expect(getStoredOfflineSessionId()).toBeNull();
    });

    it('should handle undefined gracefully', () => {
      expect(getStoredOfflineSessionId()).toBeNull();
    });
  });

  describe('clearStoredOfflineSessionId', () => {
    it('should clear a stored offline session ID', () => {
      localStorage.setItem('bingo_offline_session_id', 'ABC123');
      clearStoredOfflineSessionId();
      expect(localStorage.getItem('bingo_offline_session_id')).toBeNull();
    });

    it('should not throw if no offline session ID is stored', () => {
      expect(() => clearStoredOfflineSessionId()).not.toThrow();
    });
  });
});

describe('integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should support a full PIN workflow', () => {
    // Generate and store a PIN
    const pin = generateSecurePin();
    storePin(pin);

    // Retrieve and verify
    const retrievedPin = getStoredPin();
    expect(retrievedPin).toBe(pin);

    // Clear and verify
    clearStoredPin();
    expect(getStoredPin()).toBeNull();
  });

  it('should support a full session ID workflow', () => {
    // Generate and store a session ID
    const sessionId = generateShortSessionId();
    storeOfflineSessionId(sessionId);

    // Retrieve and verify
    const retrievedSessionId = getStoredOfflineSessionId();
    expect(retrievedSessionId).toBe(sessionId);

    // Clear and verify
    clearStoredOfflineSessionId();
    expect(getStoredOfflineSessionId()).toBeNull();
  });

  it('should keep PIN and session ID separate', () => {
    const pin = generateSecurePin();
    const sessionId = generateShortSessionId();

    storePin(pin);
    storeOfflineSessionId(sessionId);

    expect(getStoredPin()).toBe(pin);
    expect(getStoredOfflineSessionId()).toBe(sessionId);

    clearStoredPin();
    expect(getStoredPin()).toBeNull();
    expect(getStoredOfflineSessionId()).toBe(sessionId);

    clearStoredOfflineSessionId();
    expect(getStoredOfflineSessionId()).toBeNull();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, useConnectionInfo } from '../use-online-status';

describe('use-online-status', () => {
  let onlineListeners: Set<() => void>;
  let offlineListeners: Set<() => void>;
  let originalNavigator: Navigator;

  beforeEach(() => {
    onlineListeners = new Set();
    offlineListeners = new Set();

    // Save original navigator
    originalNavigator = window.navigator;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Mock window event listeners
    const originalAddEventListener = window.addEventListener.bind(window);
    const originalRemoveEventListener = window.removeEventListener.bind(window);

    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') {
        onlineListeners.add(handler as () => void);
      } else if (event === 'offline') {
        offlineListeners.add(handler as () => void);
      } else {
        originalAddEventListener(event, handler);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'online') {
        onlineListeners.delete(handler as () => void);
      } else if (event === 'offline') {
        offlineListeners.delete(handler as () => void);
      } else {
        originalRemoveEventListener(event, handler);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    onlineListeners.clear();
    offlineListeners.clear();
  });

  // Helper to simulate going online
  function goOnline() {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    onlineListeners.forEach((listener) => listener());
  }

  // Helper to simulate going offline
  function goOffline() {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    offlineListeners.forEach((listener) => listener());
  }

  describe('useOnlineStatus', () => {
    it('returns initial online status as true when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);
    });

    it('returns initial online status as false when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);
    });

    it('updates to true on online event', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);

      act(() => {
        goOnline();
      });

      expect(result.current).toBe(true);
    });

    it('updates to false on offline event', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);

      act(() => {
        goOffline();
      });

      expect(result.current).toBe(false);
    });

    it('adds event listeners on mount', () => {
      renderHook(() => useOnlineStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('cleans up listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      const onlineListenerCountBefore = onlineListeners.size;
      const offlineListenerCountBefore = offlineListeners.size;

      unmount();

      expect(onlineListeners.size).toBeLessThan(onlineListenerCountBefore);
      expect(offlineListeners.size).toBeLessThan(offlineListenerCountBefore);
    });

    it('handles multiple status changes', () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);

      act(() => {
        goOffline();
      });
      expect(result.current).toBe(false);

      act(() => {
        goOnline();
      });
      expect(result.current).toBe(true);

      act(() => {
        goOffline();
      });
      expect(result.current).toBe(false);
    });
  });

  describe('useConnectionInfo', () => {
    it('returns isOnline status', () => {
      const { result } = renderHook(() => useConnectionInfo());

      expect(result.current.isOnline).toBe(true);
    });

    it('returns null for connectionType when API not available', () => {
      const { result } = renderHook(() => useConnectionInfo());

      expect(result.current.connectionType).toBeNull();
    });

    it('returns null for effectiveType when API not available', () => {
      const { result } = renderHook(() => useConnectionInfo());

      expect(result.current.effectiveType).toBeNull();
    });

    it('returns isSlowConnection as false when effectiveType is null', () => {
      const { result } = renderHook(() => useConnectionInfo());

      expect(result.current.isSlowConnection).toBe(false);
    });

    describe('with Network Information API', () => {
      let connectionListeners: Set<() => void>;
      let mockConnection: {
        type: string | undefined;
        effectiveType: string | undefined;
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
      };

      beforeEach(() => {
        connectionListeners = new Set();

        mockConnection = {
          type: 'wifi',
          effectiveType: '4g',
          addEventListener: vi.fn((event: string, listener: () => void) => {
            if (event === 'change') {
              connectionListeners.add(listener);
            }
          }),
          removeEventListener: vi.fn((event: string, listener: () => void) => {
            if (event === 'change') {
              connectionListeners.delete(listener);
            }
          }),
        };

        Object.defineProperty(navigator, 'connection', {
          value: mockConnection,
          writable: true,
          configurable: true,
        });
      });

      afterEach(() => {
        // Clean up the connection property
        Object.defineProperty(navigator, 'connection', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        connectionListeners.clear();
      });

      it('returns connectionType when API is available', () => {
        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.connectionType).toBe('wifi');
      });

      it('returns effectiveType when API is available', () => {
        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.effectiveType).toBe('4g');
      });

      it('returns isSlowConnection as true for slow-2g', () => {
        mockConnection.effectiveType = 'slow-2g';

        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.isSlowConnection).toBe(true);
      });

      it('returns isSlowConnection as true for 2g', () => {
        mockConnection.effectiveType = '2g';

        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.isSlowConnection).toBe(true);
      });

      it('returns isSlowConnection as false for 3g', () => {
        mockConnection.effectiveType = '3g';

        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.isSlowConnection).toBe(false);
      });

      it('adds change listener on mount', () => {
        renderHook(() => useConnectionInfo());

        expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('removes change listener on unmount', () => {
        const { unmount } = renderHook(() => useConnectionInfo());

        unmount();

        expect(mockConnection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('updates values on connection change', () => {
        const { result } = renderHook(() => useConnectionInfo());

        expect(result.current.effectiveType).toBe('4g');

        act(() => {
          mockConnection.type = 'cellular';
          mockConnection.effectiveType = '3g';
          connectionListeners.forEach((listener) => listener());
        });

        expect(result.current.connectionType).toBe('cellular');
        expect(result.current.effectiveType).toBe('3g');
      });
    });

    it('updates isOnline when network status changes', () => {
      const { result } = renderHook(() => useConnectionInfo());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        goOffline();
      });

      expect(result.current.isOnline).toBe(false);
    });
  });
});

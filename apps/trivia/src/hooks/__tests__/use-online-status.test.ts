import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, useConnectionInfo } from '../use-online-status';

describe('useOnlineStatus', () => {
  let onlineEventListeners: Map<string, EventListener>;
  let originalNavigator: Navigator;

  beforeEach(() => {
    onlineEventListeners = new Map();
    originalNavigator = window.navigator;

    // Mock window event listeners
    const originalAddEventListener = window.addEventListener.bind(window);
    const originalRemoveEventListener = window.removeEventListener.bind(window);

    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler, options) => {
      if (event === 'online' || event === 'offline') {
        onlineEventListeners.set(event, handler as EventListener);
      }
      return originalAddEventListener(event, handler, options);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler, options) => {
      if (event === 'online' || event === 'offline') {
        onlineEventListeners.delete(event);
      }
      return originalRemoveEventListener(event, handler, options);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns true when online', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it('returns false when offline', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it('updates when going offline', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Go offline
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    act(() => {
      const offlineHandler = onlineEventListeners.get('offline');
      offlineHandler?.(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('updates when coming online', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // Go online
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    act(() => {
      const onlineHandler = onlineEventListeners.get('online');
      onlineHandler?.(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('subscribes to online and offline events', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    renderHook(() => useOnlineStatus());

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('unsubscribes from events on unmount', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('useConnectionInfo', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalNavigator = window.navigator;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns online status', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { result } = renderHook(() => useConnectionInfo());

    expect(result.current.isOnline).toBe(true);
  });

  it('returns null for connection info when not available', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { result } = renderHook(() => useConnectionInfo());

    expect(result.current.connectionType).toBeNull();
    expect(result.current.effectiveType).toBeNull();
  });

  it('detects slow connection', () => {
    const mockConnection = {
      type: 'cellular',
      effectiveType: '2g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
      connection: mockConnection,
    });

    const { result } = renderHook(() => useConnectionInfo());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('does not detect slow connection on fast networks', () => {
    const mockConnection = {
      type: 'wifi',
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
      connection: mockConnection,
    });

    const { result } = renderHook(() => useConnectionInfo());

    expect(result.current.isSlowConnection).toBe(false);
  });
});

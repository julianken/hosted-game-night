import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  let onlineEventListeners: Map<string, EventListener>;
  let originalNavigator: Navigator;

  beforeEach(() => {
    onlineEventListeners = new Map();
    originalNavigator = window.navigator;

    // Mock navigator.onLine
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

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

  it('hides when online', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows when offline', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    render(<OfflineBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText("You're offline. Game continues with cached audio.")
    ).toBeInTheDocument();
  });

  it('shows banner when going offline', () => {
    // Start online
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    const { rerender } = render(<OfflineBanner />);

    // Verify banner is not shown initially
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Go offline
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    // Trigger the offline event
    act(() => {
      const offlineHandler = onlineEventListeners.get('offline');
      offlineHandler?.(new Event('offline'));
    });

    rerender(<OfflineBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides banner when coming back online', () => {
    // Start offline
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    const { rerender } = render(<OfflineBanner />);

    // Verify banner is shown initially
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Go online
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: true,
    });

    // Trigger the online event
    act(() => {
      const onlineHandler = onlineEventListeners.get('online');
      onlineHandler?.(new Event('online'));
    });

    rerender(<OfflineBanner />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('registers event listeners on mount', () => {
    render(<OfflineBanner />);

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = render(<OfflineBanner />);

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('displays correct styling for alert banner', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    render(<OfflineBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('fixed', 'top-0', 'bg-amber-500');
  });

  it('contains an accessible SVG icon', () => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      onLine: false,
    });

    render(<OfflineBanner />);

    const svg = screen.getByRole('alert').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

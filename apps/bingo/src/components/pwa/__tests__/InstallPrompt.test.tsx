import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';

// Mock BeforeInstallPromptEvent
interface MockBeforeInstallPromptEvent extends Event {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function createMockInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): MockBeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt') as MockBeforeInstallPromptEvent;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  // Add preventDefault mock
  event.preventDefault = vi.fn();
  return event;
}

describe('InstallPrompt', () => {
  let eventListeners: Map<string, EventListener>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eventListeners = new Map();

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      eventListeners.set(event, handler as EventListener);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event) => {
      eventListeners.delete(event);
    });

    // Mock matchMedia - default to not standalone (not installed)
    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);

    // Mock sessionStorage
    const mockSessionStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', mockSessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not show by default (no beforeinstallprompt event)', () => {
    const { container } = render(<InstallPrompt />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
  });

  it('does not show when app is already installed (standalone mode)', () => {
    // Mock as installed
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(display-mode: standalone)',
    });

    render(<InstallPrompt />);

    expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
  });

  describe('beforeinstallprompt event handling', () => {
    it('shows install prompt when beforeinstallprompt event fires', async () => {
      render(<InstallPrompt />);

      // Trigger beforeinstallprompt event
      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Install Beak Bingo')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Add to your home screen for quick access and offline play.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    });

    it('prevents default on beforeinstallprompt to defer the prompt', () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      expect(installEvent.preventDefault).toHaveBeenCalled();
    });

    it('registers beforeinstallprompt and appinstalled event listeners', () => {
      render(<InstallPrompt />);

      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    });

    it('removes event listeners on unmount', () => {
      const { unmount } = render(<InstallPrompt />);

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });
  });

  describe('install flow', () => {
    it('calls prompt() on install button click', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Install' }));

      await waitFor(() => {
        expect(installEvent.prompt).toHaveBeenCalled();
      });
    });

    it('hides prompt when user accepts install', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent('accepted');
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Install' }));

      await waitFor(() => {
        expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
      });
    });

    it('clears deferred prompt after install attempt', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent('dismissed');
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Install' }));

      // Wait for the async operation to complete
      await waitFor(() => {
        expect(installEvent.prompt).toHaveBeenCalled();
      });

      // After dismissal, the deferred prompt is cleared
      // Component should eventually hide since deferredPrompt becomes null
      await waitFor(() => {
        expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
      });
    });
  });

  describe('dismiss flow', () => {
    it('hides prompt when Not now is clicked', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Install Beak Bingo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

      await waitFor(() => {
        expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
      });
    });

    it('stores dismissal in sessionStorage', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

      expect(sessionStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true');
    });

    it('does not show prompt if previously dismissed this session', () => {
      // Mock previously dismissed
      vi.mocked(sessionStorage.getItem).mockReturnValue('true');

      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      // Should not show because sessionStorage has dismissal flag
      expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
    });
  });

  describe('appinstalled event', () => {
    it('hides prompt when app is installed', async () => {
      render(<InstallPrompt />);

      // Show the prompt first
      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Install Beak Bingo')).toBeInTheDocument();
      });

      // Trigger appinstalled event
      act(() => {
        const handler = eventListeners.get('appinstalled');
        handler?.(new Event('appinstalled'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
      });
    });

    it('sets isInstalled state when appinstalled fires', async () => {
      const { rerender } = render(<InstallPrompt />);

      // Trigger appinstalled event
      act(() => {
        const handler = eventListeners.get('appinstalled');
        handler?.(new Event('appinstalled'));
      });

      rerender(<InstallPrompt />);

      // Even if we get a beforeinstallprompt now, it should not show
      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      expect(screen.queryByText('Install Beak Bingo')).not.toBeInTheDocument();
    });
  });

  describe('styling and accessibility', () => {
    it('renders with correct positioning classes', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        const container = screen.getByText('Install Beak Bingo').closest('div.fixed');
        expect(container).toHaveClass('fixed', 'bottom-4', 'left-4');
      });
    });

    it('contains an accessible icon', async () => {
      render(<InstallPrompt />);

      const installEvent = createMockInstallEvent();
      act(() => {
        const handler = eventListeners.get('beforeinstallprompt');
        handler?.(installEvent);
      });

      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});

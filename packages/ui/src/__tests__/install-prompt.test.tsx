import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallPrompt } from '../install-prompt';

describe('InstallPrompt', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock matchMedia to return not standalone by default
    matchMediaMock = vi.fn().mockReturnValue({ matches: false });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
      configurable: true,
    });

    // Clear sessionStorage
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> } {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const userChoiceMock = Promise.resolve({ outcome: 'dismissed' as const });
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', { value: promptMock });
    Object.defineProperty(event, 'userChoice', { value: userChoiceMock });

    act(() => {
      window.dispatchEvent(event);
    });

    return { prompt: promptMock, userChoice: userChoiceMock };
  }

  describe('rendering', () => {
    it('should render nothing when no beforeinstallprompt event', () => {
      const { container } = render(<InstallPrompt appName="Bingo" />);

      // Flush the setTimeout(0) SSR fix
      act(() => {
        vi.runAllTimers();
      });

      expect(container.innerHTML).toBe('');
    });

    it('should show install prompt when beforeinstallprompt event fires', () => {
      render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      fireBeforeInstallPrompt();

      expect(screen.getByText('Install Bingo')).toBeInTheDocument();
    });

    it('should include appName in the prompt text', () => {
      render(<InstallPrompt appName="Trivia" />);

      act(() => {
        vi.runAllTimers();
      });

      fireBeforeInstallPrompt();

      expect(screen.getByText('Install Trivia')).toBeInTheDocument();
    });

    it('should render nothing when already installed (standalone mode)', () => {
      matchMediaMock.mockReturnValue({ matches: true });

      const { container } = render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      expect(container.innerHTML).toBe('');
    });
  });

  describe('install flow', () => {
    it('should trigger prompt when Install button is clicked', async () => {
      render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      const { prompt } = fireBeforeInstallPrompt();

      await act(async () => {
        fireEvent.click(screen.getByText('Install'));
      });

      expect(prompt).toHaveBeenCalledTimes(1);
    });

    it('should dismiss prompt when Not now is clicked', () => {
      render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      fireBeforeInstallPrompt();

      fireEvent.click(screen.getByText('Not now'));

      expect(screen.queryByText('Install Bingo')).not.toBeInTheDocument();
      expect(sessionStorage.getItem('pwa-install-dismissed')).toBe('true');
    });
  });

  describe('SSR safety', () => {
    it('should use setTimeout(0) pattern for installation check', () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      render(<InstallPrompt appName="Bingo" />);

      // Verify setTimeout was called with 0 delay for SSR safety
      const ssrCheckCall = setTimeoutSpy.mock.calls.find(
        (call) => call[1] === 0
      );
      expect(ssrCheckCall).toBeDefined();

      setTimeoutSpy.mockRestore();
    });
  });

  describe('design tokens', () => {
    it('should use bg-primary on Install button instead of dynamic color', () => {
      render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      fireBeforeInstallPrompt();

      const installButton = screen.getByText('Install');
      expect(installButton.className).toContain('bg-primary');
      expect(installButton.className).toContain('text-primary-foreground');
    });

    it('should use bg-primary/10 on the icon container', () => {
      render(<InstallPrompt appName="Bingo" />);

      act(() => {
        vi.runAllTimers();
      });

      fireBeforeInstallPrompt();

      // The icon container is the parent of the SVG
      const svg = document.querySelector('svg');
      expect(svg).not.toBeNull();
      const iconContainer = svg!.parentElement;
      expect(iconContainer!.className).toContain('bg-primary/10');
    });
  });
});

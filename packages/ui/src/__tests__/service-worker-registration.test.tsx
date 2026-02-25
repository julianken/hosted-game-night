import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServiceWorkerRegistration } from '../service-worker-registration';

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render nothing initially (no updates pending)', () => {
      const { container } = render(<ServiceWorkerRegistration appName="Bingo" />);
      expect(container.innerHTML).toBe('');
    });

    it('should render nothing when no service worker support', () => {
      // jsdom has no service worker by default, so component returns null
      const { container } = render(<ServiceWorkerRegistration appName="Trivia" />);
      expect(container.innerHTML).toBe('');
    });
  });

  // Test the UpdatePrompt sub-component behavior by simulating internal state.
  // Since ServiceWorkerRegistration manages state internally via SW events,
  // we test the rendered output patterns by importing and testing the component
  // with the update UI visible. We do this by mocking the service worker flow.
  describe('update prompt UI', () => {
    let mockRegistration: {
      update: ReturnType<typeof vi.fn>;
      installing: ServiceWorker | null;
      addEventListener: ReturnType<typeof vi.fn>;
    };
    let mockWorker: {
      state: string;
      postMessage: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockWorker = {
        state: 'installed',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
      };

      mockRegistration = {
        update: vi.fn().mockResolvedValue(undefined),
        installing: mockWorker as unknown as ServiceWorker,
        addEventListener: vi.fn(),
      };

      // Mock navigator.serviceWorker
      const mockServiceWorker = {
        register: vi.fn().mockResolvedValue(mockRegistration),
        controller: {} as ServiceWorkerContainer['controller'],
        addEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true,
      });

      // Simulate production environment so the component registers SW
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should show update prompt when service worker update is available', async () => {
      render(<ServiceWorkerRegistration appName="Bingo" />);

      // Wait for register to be called and get the updatefound callback
      await vi.waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
          'updatefound',
          expect.any(Function)
        );
      });

      // Trigger updatefound
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call) => call[0] === 'updatefound'
      )![1] as () => void;
      updateFoundCallback();

      // Trigger statechange on the worker (simulating installed state)
      const stateChangeCallback = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'statechange'
      )![1] as () => void;
      stateChangeCallback();

      await vi.waitFor(() => {
        expect(screen.getByText('New version available')).toBeInTheDocument();
      });
    });

    it('should include appName in the notification text', async () => {
      render(<ServiceWorkerRegistration appName="Trivia" />);

      await vi.waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call) => call[0] === 'updatefound'
      )![1] as () => void;
      updateFoundCallback();

      const stateChangeCallback = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'statechange'
      )![1] as () => void;
      stateChangeCallback();

      await vi.waitFor(() => {
        expect(screen.getByText(/Trivia/)).toBeInTheDocument();
      });
    });

    it('should have accessible touch targets on Update and Later buttons', async () => {
      render(<ServiceWorkerRegistration appName="Bingo" />);

      await vi.waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call) => call[0] === 'updatefound'
      )![1] as () => void;
      updateFoundCallback();

      const stateChangeCallback = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'statechange'
      )![1] as () => void;
      stateChangeCallback();

      await vi.waitFor(() => {
        const updateBtn = screen.getByText('Update');
        const laterBtn = screen.getByText('Later');

        expect(updateBtn.className).toContain('min-h-[var(--size-touch)]');
        expect(laterBtn.className).toContain('min-h-[var(--size-touch)]');
      });
    });

    it('should dismiss update prompt when Later is clicked', async () => {
      render(<ServiceWorkerRegistration appName="Bingo" />);

      await vi.waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call) => call[0] === 'updatefound'
      )![1] as () => void;
      updateFoundCallback();

      const stateChangeCallback = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'statechange'
      )![1] as () => void;
      stateChangeCallback();

      await vi.waitFor(() => {
        expect(screen.getByText('Later')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Later'));

      expect(screen.queryByText('New version available')).not.toBeInTheDocument();
    });
  });
});

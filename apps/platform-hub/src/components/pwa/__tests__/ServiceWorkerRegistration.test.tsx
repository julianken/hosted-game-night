import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

describe('ServiceWorkerRegistration', () => {
  let mockServiceWorkerContainer: any;
  let mockRegistration: any;
  let mockServiceWorker: any;

  beforeEach(() => {
    // Create mock service worker
    mockServiceWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    // Create mock registration
    mockRegistration = {
      update: vi.fn(),
      installing: null,
      waiting: null,
      active: null,
      addEventListener: vi.fn(),
    };

    // Create mock service worker container
    mockServiceWorkerContainer = {
      register: vi.fn(() => Promise.resolve(mockRegistration)),
      controller: null,
      addEventListener: vi.fn(),
    };

    // Setup navigator.serviceWorker
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: mockServiceWorkerContainer,
      configurable: true,
      writable: true,
    });

    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);
      // Component renders but shows nothing initially
      expect(screen.queryByText(/new version available/i)).not.toBeInTheDocument();
    });

    it('should not render update prompt initially', () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);
      expect(screen.queryByText(/update/i)).not.toBeInTheDocument();
    });
  });

  describe('Service worker registration', () => {
    it('should not register service worker in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development');
      render(<ServiceWorkerRegistration />);

      expect(mockServiceWorkerContainer.register).not.toHaveBeenCalled();
    });

    it('should register service worker in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    it('should call update on registration', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.update).toHaveBeenCalled();
      });
    });

    it('should handle service worker not supported', () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Remove serviceWorker from navigator
      delete (window.navigator as any).serviceWorker;

      // Should not throw error
      expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    });

    it('should handle registration errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockServiceWorkerContainer.register.mockRejectedValueOnce(
        new Error('Registration failed')
      );

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Service worker registration failed:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Update detection', () => {
    it('should show update prompt when new version is available', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockServiceWorkerContainer.controller = mockServiceWorker;

      render(<ServiceWorkerRegistration />);

      // Wait for registration
      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      // Simulate updatefound event
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'updatefound'
      )?.[1];

      expect(updateFoundCallback).toBeDefined();

      // Set installing worker
      mockRegistration.installing = mockServiceWorker;

      // Trigger updatefound
      updateFoundCallback();

      // Get statechange callback
      const stateChangeCallback = mockServiceWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'statechange'
      )?.[1];

      expect(stateChangeCallback).toBeDefined();

      // Trigger statechange
      stateChangeCallback();

      // Update prompt should appear
      await waitFor(() => {
        expect(screen.getByText(/new version available/i)).toBeInTheDocument();
      });
    });

    it('should not show update prompt if no controller (first install)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockServiceWorkerContainer.controller = null; // No existing service worker

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      // Simulate updatefound event
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'updatefound'
      )?.[1];

      mockRegistration.installing = mockServiceWorker;
      updateFoundCallback();

      const stateChangeCallback = mockServiceWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'statechange'
      )?.[1];

      stateChangeCallback();

      // Update prompt should NOT appear (first install)
      await waitFor(() => {
        expect(screen.queryByText(/new version available/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Update prompt interactions', () => {
    beforeEach(async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockServiceWorkerContainer.controller = mockServiceWorker;

      render(<ServiceWorkerRegistration />);

      // Wait for registration
      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      // Trigger update found
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'updatefound'
      )?.[1];

      mockRegistration.installing = mockServiceWorker;
      updateFoundCallback();

      const stateChangeCallback = mockServiceWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'statechange'
      )?.[1];

      stateChangeCallback();

      // Wait for prompt to appear
      await waitFor(() => {
        expect(screen.getByText(/new version available/i)).toBeInTheDocument();
      });
    });

    it('should hide prompt when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const dismissButton = screen.getByRole('button', { name: /later/i });

      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/new version available/i)).not.toBeInTheDocument();
      });
    });

    it('should trigger skipWaiting and reload when update button is clicked', async () => {
      const user = userEvent.setup();
      const updateButton = screen.getByRole('button', { name: /update/i });

      await user.click(updateButton);

      // Should call postMessage with SKIP_WAITING
      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });

      // Should reload the page
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Controller change handling', () => {
    it('should reload page when controller changes', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      // Get controllerchange callback
      const controllerChangeCallback =
        mockServiceWorkerContainer.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'controllerchange'
        )?.[1];

      expect(controllerChangeCallback).toBeDefined();

      // Trigger controllerchange
      controllerChangeCallback();

      // Should reload
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should not reload twice on rapid controller changes', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      const controllerChangeCallback =
        mockServiceWorkerContainer.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'controllerchange'
        )?.[1];

      // Trigger twice rapidly
      controllerChangeCallback();
      controllerChangeCallback();

      // Should only reload once
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update prompt UI', () => {
    beforeEach(async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockServiceWorkerContainer.controller = mockServiceWorker;

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorkerContainer.register).toHaveBeenCalled();
      });

      // Trigger update
      const updateFoundCallback = mockRegistration.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'updatefound'
      )?.[1];

      mockRegistration.installing = mockServiceWorker;
      updateFoundCallback();

      const stateChangeCallback = mockServiceWorker.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'statechange'
      )?.[1];

      stateChangeCallback();

      await waitFor(() => {
        expect(screen.getByText(/new version available/i)).toBeInTheDocument();
      });
    });

    it('should have senior-friendly button sizes (min 44x44px)', () => {
      const updateButton = screen.getByRole('button', { name: /update/i });
      const dismissButton = screen.getByRole('button', { name: /later/i });

      // Check for min-h-[44px] and min-w-[44px] classes
      expect(updateButton.className).toMatch(/min-h-\[44px\]/);
      expect(updateButton.className).toMatch(/min-w-\[44px\]/);
      expect(dismissButton.className).toMatch(/min-h-\[44px\]/);
      expect(dismissButton.className).toMatch(/min-w-\[44px\]/);
    });

    it('should have large readable text (min 18px)', () => {
      const heading = screen.getByText(/new version available/i);
      const description = screen.getByText(/update now for the latest features/i);

      // Check for text-lg (18px) or larger
      expect(heading.className).toMatch(/text-lg|text-xl|text-2xl/);
      expect(description.className).toMatch(/text-base|text-lg/);
    });

    it('should display both update and dismiss buttons', () => {
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /later/i })).toBeInTheDocument();
    });
  });
});

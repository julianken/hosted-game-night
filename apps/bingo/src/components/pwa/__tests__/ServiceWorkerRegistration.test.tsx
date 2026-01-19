import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

// Mock types for ServiceWorker API
interface MockServiceWorker {
  postMessage: ReturnType<typeof vi.fn>;
  state: ServiceWorkerState;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

interface MockRegistration {
  installing: MockServiceWorker | null;
  waiting: MockServiceWorker | null;
  active: MockServiceWorker | null;
  update: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('ServiceWorkerRegistration', () => {
  let mockRegistration: MockRegistration;
  let mockServiceWorker: MockServiceWorker;
  let registerPromise: Promise<MockRegistration>;
  let swEventListeners: Map<string, EventListener>;
  let workerEventListeners: Map<string, EventListener>;

  beforeEach(() => {
    // Reset mocks
    swEventListeners = new Map();
    workerEventListeners = new Map();

    mockServiceWorker = {
      postMessage: vi.fn(),
      state: 'installed',
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        workerEventListeners.set(event, handler);
      }),
      removeEventListener: vi.fn(),
    };

    mockRegistration = {
      installing: null,
      waiting: null,
      active: mockServiceWorker,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        swEventListeners.set('registration:' + event, handler);
      }),
      removeEventListener: vi.fn(),
    };

    registerPromise = Promise.resolve(mockRegistration);

    // Mock navigator.serviceWorker
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockReturnValue(registerPromise),
        controller: mockServiceWorker,
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          swEventListeners.set('sw:' + event, handler);
        }),
        removeEventListener: vi.fn(),
      },
    });

    // Mock window.location.reload
    const mockLocation = {
      ...window.location,
      reload: vi.fn(),
    };
    vi.stubGlobal('location', mockLocation);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('service worker registration', () => {
    it('registers service worker in production environment', async () => {
      // Set production environment
      vi.stubEnv('NODE_ENV', 'production');

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      });
    });

    it('does not register service worker in development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');

      render(<ServiceWorkerRegistration />);

      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('does not register when serviceWorker is not supported', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubGlobal('navigator', {});

      render(<ServiceWorkerRegistration />);

      // Should not throw and should render nothing
      expect(screen.queryByText('New version available')).not.toBeInTheDocument();
    });

    it('calls registration.update() on page load', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.update).toHaveBeenCalled();
      });
    });

    it('handles registration errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const registrationError = new Error('Registration failed');
      vi.mocked(navigator.serviceWorker.register).mockRejectedValueOnce(registrationError);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Service worker registration failed:',
          registrationError
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('update prompt', () => {
    it('shows update prompt when new version is available', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const newWorker: MockServiceWorker = {
        postMessage: vi.fn(),
        state: 'installing',
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          workerEventListeners.set(event, handler);
        }),
        removeEventListener: vi.fn(),
      };

      mockRegistration.installing = newWorker;

      render(<ServiceWorkerRegistration />);

      // Wait for registration
      await waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
          'updatefound',
          expect.any(Function)
        );
      });

      // Trigger updatefound event
      const updateFoundHandler = swEventListeners.get('registration:updatefound');
      expect(updateFoundHandler).toBeDefined();
      await act(async () => {
        updateFoundHandler?.(new Event('updatefound'));
      });

      // Simulate worker state change to installed
      newWorker.state = 'installed';
      const stateChangeHandler = workerEventListeners.get('statechange');
      expect(stateChangeHandler).toBeDefined();
      await act(async () => {
        stateChangeHandler?.(new Event('statechange'));
      });

      await waitFor(() => {
        expect(screen.getByText('New version available')).toBeInTheDocument();
      });

      expect(
        screen.getByText('A new version of Beak Bingo is ready. Update now for the latest features.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument();
    });

    it('does not show update prompt if no controller exists', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      // No existing controller (first install)
      vi.stubGlobal('navigator', {
        serviceWorker: {
          register: vi.fn().mockReturnValue(registerPromise),
          controller: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      });

      const newWorker: MockServiceWorker = {
        postMessage: vi.fn(),
        state: 'installing',
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          workerEventListeners.set(event, handler);
        }),
        removeEventListener: vi.fn(),
      };

      mockRegistration.installing = newWorker;

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      // Trigger updatefound event
      const updateFoundHandler = swEventListeners.get('registration:updatefound');
      updateFoundHandler?.(new Event('updatefound'));

      // Simulate worker state change
      newWorker.state = 'installed';
      const stateChangeHandler = workerEventListeners.get('statechange');
      stateChangeHandler?.(new Event('statechange'));

      // Should not show update prompt
      expect(screen.queryByText('New version available')).not.toBeInTheDocument();
    });

    it('sends SKIP_WAITING message and reloads on update click', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const newWorker: MockServiceWorker = {
        postMessage: vi.fn(),
        state: 'installing',
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          workerEventListeners.set(event, handler);
        }),
        removeEventListener: vi.fn(),
      };

      mockRegistration.installing = newWorker;

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      // Trigger update flow
      const updateFoundHandler = swEventListeners.get('registration:updatefound');
      await act(async () => {
        updateFoundHandler?.(new Event('updatefound'));
      });

      newWorker.state = 'installed';
      const stateChangeHandler = workerEventListeners.get('statechange');
      await act(async () => {
        stateChangeHandler?.(new Event('statechange'));
      });

      await waitFor(() => {
        expect(screen.getByText('New version available')).toBeInTheDocument();
      });

      // Click Update button
      fireEvent.click(screen.getByRole('button', { name: 'Update' }));

      expect(newWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('hides update prompt on dismiss click', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const newWorker: MockServiceWorker = {
        postMessage: vi.fn(),
        state: 'installing',
        addEventListener: vi.fn((event: string, handler: EventListener) => {
          workerEventListeners.set(event, handler);
        }),
        removeEventListener: vi.fn(),
      };

      mockRegistration.installing = newWorker;

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalled();
      });

      // Trigger update flow
      const updateFoundHandler = swEventListeners.get('registration:updatefound');
      await act(async () => {
        updateFoundHandler?.(new Event('updatefound'));
      });

      newWorker.state = 'installed';
      const stateChangeHandler = workerEventListeners.get('statechange');
      await act(async () => {
        stateChangeHandler?.(new Event('statechange'));
      });

      await waitFor(() => {
        expect(screen.getByText('New version available')).toBeInTheDocument();
      });

      // Click Later button
      fireEvent.click(screen.getByRole('button', { name: 'Later' }));

      await waitFor(() => {
        expect(screen.queryByText('New version available')).not.toBeInTheDocument();
      });
    });
  });

  describe('controller change handling', () => {
    it('reloads page on controller change', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
          'controllerchange',
          expect.any(Function)
        );
      });

      // Trigger controllerchange event
      const controllerChangeHandler = swEventListeners.get('sw:controllerchange');
      expect(controllerChangeHandler).toBeDefined();
      controllerChangeHandler?.(new Event('controllerchange'));

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('only reloads once on multiple controller changes', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.addEventListener).toHaveBeenCalled();
      });

      // Trigger controllerchange event multiple times
      const controllerChangeHandler = swEventListeners.get('sw:controllerchange');
      controllerChangeHandler?.(new Event('controllerchange'));
      controllerChangeHandler?.(new Event('controllerchange'));
      controllerChangeHandler?.(new Event('controllerchange'));

      // Should only reload once
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('rendering', () => {
    it('renders nothing when no update is available', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { container } = render(<ServiceWorkerRegistration />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});

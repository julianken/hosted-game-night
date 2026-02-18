import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mock references are available when vi.mock factories run
const {
  mockInitializeFaro,
  mockGetWebInstrumentations,
  mockFaroState,
  MockReactIntegration,
} = vi.hoisted(() => ({
  mockInitializeFaro: vi.fn(),
  mockGetWebInstrumentations: vi.fn(() => [{ name: 'web-instrumentation' }]),
  mockFaroState: { api: undefined as unknown },
  MockReactIntegration: vi.fn().mockImplementation(function (this: Record<string, string>) {
    this.name = 'react-integration';
  }),
}));

vi.mock('@grafana/faro-web-sdk', () => ({
  get faro() {
    return mockFaroState;
  },
  initializeFaro: mockInitializeFaro,
  getWebInstrumentations: mockGetWebInstrumentations,
}));

vi.mock('@grafana/faro-react', () => ({
  ReactIntegration: MockReactIntegration,
}));

// Import after mocks are set up
import { initFaro } from '../faro';

describe('initFaro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFaroState.api = undefined;
    delete process.env.NEXT_PUBLIC_FARO_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  });

  it('should not throw when no URL is provided', () => {
    expect(() => initFaro({ appName: 'test' })).not.toThrow();
    expect(mockInitializeFaro).not.toHaveBeenCalled();
  });

  it('should not throw when window is undefined', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - Simulating SSR by removing window
    delete globalThis.window;

    try {
      expect(() =>
        initFaro({ appName: 'test', url: 'https://example.com/collect' })
      ).not.toThrow();
      expect(mockInitializeFaro).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it('should call initializeFaro with correct config when URL is provided via parameter', () => {
    const url = 'https://faro-collector.example.com/collect/abc123';

    initFaro({ appName: 'bingo', url });

    expect(mockInitializeFaro).toHaveBeenCalledOnce();
    const config = mockInitializeFaro.mock.calls[0]![0];
    expect(config.url).toBe(url);
    expect(config.app.name).toBe('bingo');
    expect(config.app.version).toBe('0.0.0');
    expect(config.app.environment).toBe('test');
    expect(config.instrumentations).toHaveLength(2);
    expect(config.ignoreErrors).toHaveLength(3);
  });

  it('should use NEXT_PUBLIC_FARO_URL env var when no URL parameter is provided', () => {
    const envUrl = 'https://faro-env.example.com/collect/xyz';
    process.env.NEXT_PUBLIC_FARO_URL = envUrl;

    initFaro({ appName: 'trivia' });

    expect(mockInitializeFaro).toHaveBeenCalledOnce();
    expect(mockInitializeFaro.mock.calls[0]![0].url).toBe(envUrl);
  });

  it('should use Vercel env vars for version and environment when available', () => {
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = 'abc123def';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';

    initFaro({ appName: 'platform-hub', url: 'https://example.com/collect' });

    const config = mockInitializeFaro.mock.calls[0]![0];
    expect(config.app.version).toBe('abc123def');
    expect(config.app.environment).toBe('production');
  });

  it('should prevent double initialization', () => {
    // First call should initialize
    initFaro({ appName: 'bingo', url: 'https://example.com/collect' });
    expect(mockInitializeFaro).toHaveBeenCalledOnce();

    // Simulate Faro being initialized by setting faro.api
    mockFaroState.api = { pushError: vi.fn() };

    // Second call should be a no-op
    initFaro({ appName: 'bingo', url: 'https://example.com/collect' });
    expect(mockInitializeFaro).toHaveBeenCalledOnce();
  });

  it('should fail silently if initializeFaro throws', () => {
    mockInitializeFaro.mockImplementationOnce(() => {
      throw new Error('Faro initialization failed');
    });

    expect(() =>
      initFaro({ appName: 'bingo', url: 'https://example.com/collect' })
    ).not.toThrow();
  });

  it('should configure captureConsole as false', () => {
    initFaro({ appName: 'bingo', url: 'https://example.com/collect' });

    expect(mockGetWebInstrumentations).toHaveBeenCalledWith({
      captureConsole: false,
    });
  });
});

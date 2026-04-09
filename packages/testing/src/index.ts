// Testing package - Shared test utilities and mocks
// Re-export all mocks for convenience

// Mocks - BroadcastChannel
export {
  mockBroadcastChannel,
  MockBroadcastChannel,
  resetMockBroadcastChannel,
  simulateMessage,
} from './mocks/broadcast-channel';

// Mocks - Audio
export {
  mockAudio,
  MockAudio,
  createMockAudio,
} from './mocks/audio';

// Mocks - Sentry
export {
  mockSentry,
  type MockScope,
  type MockSentry,
} from './mocks/sentry';

// Mocks - OpenTelemetry
export {
  mockOtel,
  mockTracer,
  mockTracerProvider,
  type MockSpan,
  type MockTracer,
  type MockTracerProvider,
  type MockOtel,
} from './mocks/otel';

// Helpers
export { HELPERS_PLACEHOLDER } from './helpers/index';

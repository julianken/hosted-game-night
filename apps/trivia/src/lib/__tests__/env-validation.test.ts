import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateEnvironment,
  warnIfMissingTriviaApiKey,
} from '../env-validation';

describe('env-validation (trivia)', () => {
  afterEach(() => {
    delete process.env.THE_TRIVIA_API_KEY;
  });

  describe('warnIfMissingTriviaApiKey', () => {
    it('should not warn when THE_TRIVIA_API_KEY is set', () => {
      process.env.THE_TRIVIA_API_KEY = 'some-api-key';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingTriviaApiKey();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn when THE_TRIVIA_API_KEY is not set', () => {
      delete process.env.THE_TRIVIA_API_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      warnIfMissingTriviaApiKey();

      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('THE_TRIVIA_API_KEY is not set')
      );
      warnSpy.mockRestore();
    });

    it('should not throw (warning only)', () => {
      delete process.env.THE_TRIVIA_API_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => warnIfMissingTriviaApiKey()).not.toThrow();
      warnSpy.mockRestore();
    });
  });

  describe('validateEnvironment', () => {
    it('should not throw (no-op in standalone mode)', () => {
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should warn about missing trivia API key', () => {
      delete process.env.THE_TRIVIA_API_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      validateEnvironment();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('THE_TRIVIA_API_KEY is not set')
      );
      warnSpy.mockRestore();
    });

    it('should not warn when trivia API key is set', () => {
      process.env.THE_TRIVIA_API_KEY = 'some-api-key';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      validateEnvironment();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

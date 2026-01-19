import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFullscreen } from '../use-fullscreen';

describe('useFullscreen', () => {
  // Store original document methods
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(
    Document.prototype,
    'fullscreenElement'
  );
  const originalExitFullscreen = document.exitFullscreen;
  const originalRequestFullscreen = Element.prototype.requestFullscreen;

  // Mock functions
  let mockExitFullscreen: ReturnType<typeof vi.fn>;
  let mockRequestFullscreen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset fullscreen state
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });

    mockExitFullscreen = vi.fn().mockResolvedValue(undefined);
    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);

    document.exitFullscreen = mockExitFullscreen;
    Element.prototype.requestFullscreen = mockRequestFullscreen;
  });

  afterEach(() => {
    // Restore original methods
    if (originalFullscreenElement) {
      Object.defineProperty(Document.prototype, 'fullscreenElement', originalFullscreenElement);
    }
    document.exitFullscreen = originalExitFullscreen;
    Element.prototype.requestFullscreen = originalRequestFullscreen;
  });

  describe('initial state', () => {
    it('should return isFullscreen as false initially', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(typeof result.current.toggleFullscreen).toBe('function');
      expect(typeof result.current.enterFullscreen).toBe('function');
      expect(typeof result.current.exitFullscreen).toBe('function');
    });
  });

  describe('toggleFullscreen', () => {
    it('should call requestFullscreen when not in fullscreen', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it('should call exitFullscreen when in fullscreen', async () => {
      // Set fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockExitFullscreen).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequestFullscreen.mockRejectedValueOnce(new Error('Fullscreen denied'));

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fullscreen toggle failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('enterFullscreen', () => {
    it('should call requestFullscreen', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it('should not call requestFullscreen if already in fullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockRequestFullscreen).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequestFullscreen.mockRejectedValueOnce(new Error('Fullscreen denied'));

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Enter fullscreen failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('exitFullscreen', () => {
    it('should call exitFullscreen when in fullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(mockExitFullscreen).toHaveBeenCalled();
    });

    it('should not call exitFullscreen if not in fullscreen', async () => {
      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(mockExitFullscreen).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExitFullscreen.mockRejectedValueOnce(new Error('Exit denied'));

      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Exit fullscreen failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('fullscreen change events', () => {
    it('should update isFullscreen when fullscreenchange event fires', async () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.isFullscreen).toBe(false);

      // Simulate entering fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(true);
      });
    });

    it('should update isFullscreen when exiting fullscreen', async () => {
      // Start in fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      // Need to trigger the initial check
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(true);
      });

      // Exit fullscreen
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => null,
      });

      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(false);
      });
    });

    it('should respond to webkitfullscreenchange event', async () => {
      const { result } = renderHook(() => useFullscreen());

      // Simulate entering fullscreen via webkit
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      act(() => {
        document.dispatchEvent(new Event('webkitfullscreenchange'));
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(true);
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useFullscreen());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'fullscreenchange',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webkitfullscreenchange',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('webkit prefix support', () => {
    it('should use webkitRequestFullscreen when requestFullscreen is not available', async () => {
      // Remove standard API
      const tempRequestFullscreen = Element.prototype.requestFullscreen;
      // @ts-expect-error - testing webkit fallback
      delete Element.prototype.requestFullscreen;

      const mockWebkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);
      // @ts-expect-error - adding webkit method
      Element.prototype.webkitRequestFullscreen = mockWebkitRequestFullscreen;

      const { result } = renderHook(() => useFullscreen());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockWebkitRequestFullscreen).toHaveBeenCalled();

      // Restore
      Element.prototype.requestFullscreen = tempRequestFullscreen;
      // @ts-expect-error - cleaning up webkit method
      delete Element.prototype.webkitRequestFullscreen;
    });

    it('should check webkitFullscreenElement when fullscreenElement is null', async () => {
      // Set webkit fullscreen element
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => null,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });

      const { result } = renderHook(() => useFullscreen());

      // Trigger check
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(true);
      });

      // Cleanup
      Object.defineProperty(document, 'webkitFullscreenElement', {
        configurable: true,
        get: () => undefined,
      });
    });
  });
});

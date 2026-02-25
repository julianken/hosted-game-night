'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Extended Document interface for vendor-prefixed fullscreen methods.
 */
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

/**
 * Extended Element interface for vendor-prefixed fullscreen methods.
 */
interface FullscreenElement extends Element {
  webkitRequestFullscreen?: () => Promise<void>;
}

/**
 * Hook for managing fullscreen state with browser compatibility.
 * Supports both standard Fullscreen API and webkit-prefixed versions.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check current fullscreen state
  const checkFullscreen = useCallback(() => {
    const doc = document as FullscreenDocument;
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement || doc.webkitFullscreenElement
    );
    setIsFullscreen(isCurrentlyFullscreen);
    return isCurrentlyFullscreen;
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const elem = document.documentElement as FullscreenElement;

    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        // Enter fullscreen
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  // Enter fullscreen mode
  const enterFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const elem = document.documentElement as FullscreenElement;

    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      return; // Already in fullscreen
    }

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      }
    } catch (error) {
      console.error('Enter fullscreen failed:', error);
    }
  }, []);

  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;

    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      return; // Not in fullscreen
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      checkFullscreen();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Initial check
    checkFullscreen();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [checkFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}

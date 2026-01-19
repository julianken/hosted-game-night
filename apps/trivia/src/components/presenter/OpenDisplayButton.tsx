'use client';

import { useCallback } from 'react';

interface OpenDisplayButtonProps {
  sessionId: string;
}

export function OpenDisplayButton({ sessionId }: OpenDisplayButtonProps) {
  const openDisplay = useCallback(() => {
    const displayUrl = `${window.location.origin}/display?session=${sessionId}`;
    const displayWindow = window.open(
      displayUrl,
      `trivia-display-${sessionId}`,
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );

    // Focus the display window if it already exists
    if (displayWindow) {
      displayWindow.focus();
    }
  }, [sessionId]);

  return (
    <button
      onClick={openDisplay}
      className="px-4 py-2 rounded-lg text-base font-medium
        bg-secondary hover:bg-secondary/80 text-secondary-foreground
        transition-colors duration-200"
    >
      Open Display
    </button>
  );
}

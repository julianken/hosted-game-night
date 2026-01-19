'use client';

export interface WaitingDisplayProps {
  message: string;
}

/**
 * Waiting state display for the audience view.
 * Shows a spinner and message when waiting for the presenter or between states.
 */
export function WaitingDisplay({ message }: WaitingDisplayProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="w-32 h-32 rounded-full border-8 border-muted/30 border-t-primary animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-3xl md:text-4xl text-muted-foreground">{message}</p>
      <p className="text-xl text-muted">
        The game will appear here when the presenter is ready.
      </p>
    </div>
  );
}

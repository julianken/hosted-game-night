/**
 * Play an audio file as a one-shot (no pooling).
 * Creates a temporary HTMLAudioElement, plays it, then releases the media
 * resource on completion to prevent memory leaks.
 *
 * Returns a Promise that resolves when playback ends (or on error/abort).
 * Returns immediately (resolved) if Audio is unavailable (SSR).
 */
export async function playAudioFile(
  src: string,
  volume: number
): Promise<void> {
  if (typeof Audio === 'undefined') {
    return;
  }

  const audio = new Audio(src);
  audio.volume = volume;

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.src = ''; // Release media resource - prevents memory leak
    };

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      resolve();
    };
    audio.play().catch(() => {
      cleanup();
      resolve();
    });
  });
}

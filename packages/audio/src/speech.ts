/**
 * Stop all in-progress Web Speech API speech synthesis.
 * Safe to call in SSR — no-ops if speechSynthesis is unavailable.
 */
export function stopAllSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

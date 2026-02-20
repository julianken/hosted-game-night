'use client';

/**
 * EmergencyBlankScene (T1.9)
 *
 * Pure black screen for emergency use. Renders outside AnimatePresence
 * (no exit transition) in SceneRouter for immediate blanking.
 *
 * Uses display-canvas class for full viewport coverage.
 * z-index 100 ensures it sits above all other content.
 * SR-only text communicates state to assistive technology.
 */
export function EmergencyBlankScene() {
  return (
    <div
      className="display-canvas"
      style={{ zIndex: 100, background: '#000000' }}
      role="alert"
      aria-live="assertive"
    >
      <span className="sr-only">Display blanked by presenter</span>
    </div>
  );
}

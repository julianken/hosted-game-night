'use client';

import {
  KeyboardShortcutsModal as SharedKeyboardShortcutsModal,
  type KeyboardShortcutsModalProps,
  type KeyboardShortcut,
} from '@joolie-boolie/ui';

export type { KeyboardShortcutsModalProps, KeyboardShortcut };

const defaultShortcuts: KeyboardShortcut[] = [
  { key: 'Space', label: 'Space', description: 'Roll / Call next ball' },
  { key: 'P', label: 'P', description: 'Pause / Resume game' },
  { key: 'R', label: 'R', description: 'Reset game' },
  { key: 'U', label: 'U', description: 'Undo last call' },
  { key: 'M', label: 'M', description: 'Mute / Unmute audio' },
  { key: 'F', label: 'F', description: 'Toggle fullscreen' },
  { key: '?', label: '?', description: 'Show this help' },
];

/**
 * Bingo-specific keyboard shortcuts modal.
 * Wraps the shared KeyboardShortcutsModal with bingo defaults.
 * Pass `shortcuts` prop to override defaults (e.g. display-view shortcuts).
 */
export function KeyboardShortcutsModal({
  shortcuts = defaultShortcuts,
  ...props
}: KeyboardShortcutsModalProps) {
  return <SharedKeyboardShortcutsModal shortcuts={shortcuts} {...props} />;
}

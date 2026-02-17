'use client';

import {
  KeyboardShortcutsModal as SharedKeyboardShortcutsModal,
  type KeyboardShortcutsModalProps,
  type KeyboardShortcut,
} from '@joolie-boolie/ui';

export type { KeyboardShortcutsModalProps, KeyboardShortcut };

const defaultShortcuts: KeyboardShortcut[] = [
  { key: 'ArrowUp', label: 'Up', description: 'Previous question' },
  { key: 'ArrowDown', label: 'Down', description: 'Next question' },
  { key: 'Space', label: 'Space', description: 'Peek answer' },
  { key: 'D', label: 'D', description: 'Toggle display question' },
  { key: 'P', label: 'P', description: 'Pause / Resume game' },
  { key: 'E', label: 'E', description: 'Emergency pause' },
  { key: 'R', label: 'R', description: 'Reset game' },
  { key: 'N', label: 'N', description: 'Next round' },
  { key: 'M', label: 'M', description: 'Mute / Unmute TTS' },
  { key: 'T', label: 'T', description: 'Toggle scoreboard on display' },
  { key: 'F', label: 'F', description: 'Toggle fullscreen' },
  { key: '?', label: '?', description: 'Show this help' },
];

/**
 * Trivia-specific keyboard shortcuts modal.
 * Wraps the shared KeyboardShortcutsModal with trivia defaults.
 * Pass `shortcuts` prop to override defaults.
 */
export function KeyboardShortcutsModal({
  shortcuts = defaultShortcuts,
  ...props
}: KeyboardShortcutsModalProps) {
  return <SharedKeyboardShortcutsModal shortcuts={shortcuts} {...props} />;
}

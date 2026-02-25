'use client';

import { useState, useEffect } from 'react';
import { RoomSetupModal as SharedRoomSetupModal, type RoomSetupModalProps as SharedRoomSetupModalProps } from '@joolie-boolie/ui';
import { TemplateSelector } from './TemplateSelector';
import { useGameStore } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { patternRegistry } from '@/lib/game/patterns';
import type { VoicePackId } from '@/types';

export type { RoomSetupModalProps as SharedRoomSetupModalProps };

export type RoomSetupModalProps = Omit<SharedRoomSetupModalProps, 'gameLabel' | 'children' | 'templateSelectorPosition'>;

export function RoomSetupModal(props: RoomSetupModalProps) {
  const { isOpen, isLoading = false } = props;
  const [hasLoadedDefaultTemplate, setHasLoadedDefaultTemplate] = useState(false);

  // Get store actions for auto-loading default template
  const setPattern = useGameStore((state) => state.setPattern);
  const setAutoCallEnabled = useGameStore((state) => state.toggleAutoCall);
  const setAutoCallSpeed = useGameStore((state) => state.setAutoCallSpeed);
  const autoCallEnabled = useGameStore((s) => s.autoCallEnabled);
  const setVoicePack = useAudioStore((state) => state.setVoicePack);

  // Auto-load default template when modal opens
  useEffect(() => {
    if (isOpen && !hasLoadedDefaultTemplate) {
      const loadDefaultTemplate = async () => {
        try {
          const response = await fetch('/api/templates');
          if (!response || !response.ok) {
            // Mark as loaded even on failure to prevent retries
            setHasLoadedDefaultTemplate(true);
            return; // Silently fail - not critical
          }

          const data = await response.json();
          const templates = data.data || [];
          const defaultTemplate = templates.find((t: { is_default: boolean }) => t.is_default);

          if (defaultTemplate) {
            // Load pattern
            const pattern = patternRegistry.get(defaultTemplate.pattern_id);
            if (pattern) {
              setPattern(pattern);
            }

            // Load auto-call settings
            if (defaultTemplate.auto_call_enabled !== autoCallEnabled) {
              setAutoCallEnabled();
            }
            setAutoCallSpeed(defaultTemplate.auto_call_interval);

            // Load voice pack
            setVoicePack(defaultTemplate.voice_pack as VoicePackId);
          }

          setHasLoadedDefaultTemplate(true);
        } catch (err) {
          console.error('Error loading default template:', err);
          // Mark as loaded even on error to prevent retries
          setHasLoadedDefaultTemplate(true);
          // Silently fail - not critical to modal functionality
        }
      };

      loadDefaultTemplate();
    }
  }, [isOpen, hasLoadedDefaultTemplate, setPattern, setAutoCallEnabled, setAutoCallSpeed, setVoicePack, autoCallEnabled]);

  return (
    <SharedRoomSetupModal
      {...props}
      gameLabel="bingo"
      templateSelectorPosition="bottom"
    >
      <TemplateSelector disabled={isLoading} />
    </SharedRoomSetupModal>
  );
}

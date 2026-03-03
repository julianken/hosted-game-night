'use client';

/**
 * Auto-loads the user's default template on first mount.
 * Silent failure — no toast, no error display.
 * Fire-once: uses a ref to prevent re-fetching.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { convertTemplateQuestion } from '@/components/presenter/TemplateSelector';
import type { TriviaTemplate } from '@joolie-boolie/database/types';

export function useAutoLoadDefaultTemplate() {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const loadDefault = async () => {
      try {
        const response = await fetch('/api/templates/default');
        if (!response.ok) return; // Silent failure for unauthenticated

        const data = await response.json();
        const template: TriviaTemplate | null = data.template;
        if (!template) return; // No default template set

        // Convert template questions
        const questionsPerRound = template.questions_per_round;
        const convertedQuestions = template.questions.map((dbQuestion, index) => {
          const roundIndex = Math.floor(index / questionsPerRound);
          return convertTemplateQuestion(dbQuestion, roundIndex);
        });

        // Import questions
        const { importQuestions, updateSettings } = useGameStore.getState();
        importQuestions(convertedQuestions, 'replace');

        // Update game-store settings
        updateSettings({
          timerDuration: template.timer_duration,
          roundsCount: template.rounds_count,
          questionsPerRound: template.questions_per_round,
        });

        // Mirror to settings-store (same fix as WU-B)
        const { updateSetting } = useSettingsStore.getState();
        updateSetting('timerDuration', template.timer_duration);
        updateSetting('roundsCount', template.rounds_count);
        updateSetting('questionsPerRound', template.questions_per_round);
      } catch {
        // Silent failure — user may not be authenticated
      }
    };

    loadDefault();
  }, []);
}

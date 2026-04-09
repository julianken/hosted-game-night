'use client';

/**
 * Auto-loads the user's default template on first mount.
 * Silent failure — no toast, no error display.
 * Fire-once: uses a ref to prevent re-loading.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTriviaTemplateStore } from '@/stores/template-store';
import { convertTemplateQuestion } from '@/components/presenter/TemplateSelector';

export function useAutoLoadDefaultTemplate() {
  const hasFired = useRef(false);
  const getDefault = useTriviaTemplateStore((state) => state.getDefault);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    try {
      const template = getDefault();
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
      // Silent failure
    }
  }, [getDefault]);
}

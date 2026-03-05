import { describe, it, expect } from 'vitest';
import { getNextScene } from '../scene';
import type { SceneTransitionContext } from '../scene';

describe('round_scoring scene transitions', () => {
  const defaultCtx: SceneTransitionContext = {
    isLastQuestion: true,
    isLastRound: false,
  };

  const lastRoundCtx: SceneTransitionContext = {
    isLastQuestion: true,
    isLastRound: true,
  };

  describe('recap_qa -> round_scoring', () => {
    it('should transition from recap_qa to round_scoring on advance', () => {
      const next = getNextScene('recap_qa', 'advance', defaultCtx);
      expect(next).toBe('round_scoring');
    });

    it('should transition from recap_qa to round_scoring on skip', () => {
      const next = getNextScene('recap_qa', 'skip', defaultCtx);
      expect(next).toBe('round_scoring');
    });

    it('should transition from recap_qa to round_intro on next_round (non-last)', () => {
      const next = getNextScene('recap_qa', 'next_round', defaultCtx);
      expect(next).toBe('round_intro');
    });

    it('should transition from recap_qa to final_buildup on next_round (last round)', () => {
      const next = getNextScene('recap_qa', 'next_round', lastRoundCtx);
      expect(next).toBe('final_buildup');
    });
  });

  describe('round_scoring transitions', () => {
    it('should transition from round_scoring to recap_scores on advance', () => {
      const next = getNextScene('round_scoring', 'advance', defaultCtx);
      expect(next).toBe('recap_scores');
    });

    it('should transition from round_scoring to round_intro on next_round (non-last)', () => {
      const next = getNextScene('round_scoring', 'next_round', defaultCtx);
      expect(next).toBe('round_intro');
    });

    it('should transition from round_scoring to final_buildup on next_round (last round)', () => {
      const next = getNextScene('round_scoring', 'next_round', lastRoundCtx);
      expect(next).toBe('final_buildup');
    });

    it('should transition from round_scoring to recap_scores on skip (Enter key)', () => {
      const next = getNextScene('round_scoring', 'skip', defaultCtx);
      expect(next).toBe('recap_scores');
    });

    it('should return null for unsupported triggers', () => {
      expect(getNextScene('round_scoring', 'close', defaultCtx)).toBeNull();
      expect(getNextScene('round_scoring', 'back', defaultCtx)).toBeNull();
      expect(getNextScene('round_scoring', 'auto', defaultCtx)).toBeNull();
    });
  });

  describe('round_scoring in the full flow', () => {
    it('should complete the full recap flow: recap_qa -> round_scoring -> recap_scores', () => {
      const step1 = getNextScene('recap_qa', 'advance', defaultCtx);
      expect(step1).toBe('round_scoring');

      const step2 = getNextScene('round_scoring', 'advance', defaultCtx);
      expect(step2).toBe('recap_scores');

      const step3 = getNextScene('recap_scores', 'advance', defaultCtx);
      expect(step3).toBe('round_intro');
    });
  });
});

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

  describe('round_summary -> round_scoring', () => {
    it('should transition from round_summary to round_scoring on advance', () => {
      const next = getNextScene('round_summary', 'advance', defaultCtx);
      expect(next).toBe('round_scoring');
    });
  });

  describe('round_scoring transitions', () => {
    it('should transition from round_scoring to recap_qa on advance', () => {
      const next = getNextScene('round_scoring', 'advance', defaultCtx);
      expect(next).toBe('recap_qa');
    });

    it('should transition from round_scoring to recap_qa on skip', () => {
      const next = getNextScene('round_scoring', 'skip', defaultCtx);
      expect(next).toBe('recap_qa');
    });

    it('should transition from round_scoring to round_summary on back', () => {
      const next = getNextScene('round_scoring', 'back', defaultCtx);
      expect(next).toBe('round_summary');
    });

    it('should transition from round_scoring to round_intro on next_round (non-last)', () => {
      const next = getNextScene('round_scoring', 'next_round', defaultCtx);
      expect(next).toBe('round_intro');
    });

    it('should transition from round_scoring to final_buildup on next_round (last round)', () => {
      const next = getNextScene('round_scoring', 'next_round', lastRoundCtx);
      expect(next).toBe('final_buildup');
    });

    it('should return null for unsupported triggers', () => {
      expect(getNextScene('round_scoring', 'close', defaultCtx)).toBeNull();
      expect(getNextScene('round_scoring', 'auto', defaultCtx)).toBeNull();
    });
  });

  describe('recap_qa terminal transitions', () => {
    it('should transition from recap_qa to recap_scores on advance (non-last round)', () => {
      const next = getNextScene('recap_qa', 'advance', defaultCtx);
      expect(next).toBe('recap_scores');
    });

    it('should transition from recap_qa to final_buildup on advance (last round)', () => {
      const next = getNextScene('recap_qa', 'advance', lastRoundCtx);
      expect(next).toBe('final_buildup');
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

  describe('full between-rounds flow', () => {
    it('should complete: round_summary -> round_scoring -> recap_qa -> recap_scores -> round_intro', () => {
      const step1 = getNextScene('round_summary', 'advance', defaultCtx);
      expect(step1).toBe('round_scoring');

      const step2 = getNextScene('round_scoring', 'advance', defaultCtx);
      expect(step2).toBe('recap_qa');

      const step3 = getNextScene('recap_qa', 'advance', defaultCtx);
      expect(step3).toBe('recap_scores');

      const step4 = getNextScene('recap_scores', 'advance', defaultCtx);
      expect(step4).toBe('round_intro');
    });

    it('final round: round_summary -> round_scoring -> recap_qa -> final_buildup', () => {
      const step1 = getNextScene('round_summary', 'advance', lastRoundCtx);
      expect(step1).toBe('round_scoring');

      const step2 = getNextScene('round_scoring', 'advance', lastRoundCtx);
      expect(step2).toBe('recap_qa');

      const step3 = getNextScene('recap_qa', 'advance', lastRoundCtx);
      expect(step3).toBe('final_buildup');
    });
  });
});

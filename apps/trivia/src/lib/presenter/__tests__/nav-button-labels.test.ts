import { describe, it, expect } from 'vitest';
import {
  getNavButtonLabels,
  type NavLabelContext,
  type NavButtonLabels,
} from '../nav-button-labels';
import type { AudienceScene } from '@/types/audience-scene';

// Default context for scenes that don't use context values
const defaultCtx: NavLabelContext = {
  isLastQuestion: false,
  isLastRound: false,
  recapShowingAnswer: null,
};

// Alias for readability in context-dependent tests
const notLastCtx = defaultCtx;

const lastQuestionNotLastRoundCtx: NavLabelContext = {
  isLastQuestion: true,
  isLastRound: false,
  recapShowingAnswer: null,
};

const lastQuestionLastRoundCtx: NavLabelContext = {
  isLastQuestion: true,
  isLastRound: true,
  recapShowingAnswer: null,
};

const lastRoundCtx: NavLabelContext = {
  isLastQuestion: false,
  isLastRound: true,
  recapShowingAnswer: null,
};

describe('getNavButtonLabels', () => {
  describe('static forward labels (context-independent)', () => {
    it.each<[AudienceScene, string | null]>([
      ['waiting', 'Start Game'],
      ['game_intro', 'Skip Intro'],
      ['round_intro', 'Skip Intro'],
      ['question_anticipation', 'Skip'],
      ['question_display', 'Close Question'],
      ['round_summary', 'Review Answers'],
      ['recap_title', 'Start Review'],
      ['final_buildup', 'Skip'],
      ['final_podium', null],
      ['paused', null],
      ['emergency_blank', null],
    ])('%s forward label = %s', (scene, expectedForward) => {
      const result = getNavButtonLabels(scene, defaultCtx);
      expect(result.forward).toBe(expectedForward);
    });
  });

  describe('question_closed — context-dependent forward', () => {
    it('returns "Next Question" when !isLastQuestion', () => {
      const result = getNavButtonLabels('question_closed', notLastCtx);
      expect(result.forward).toBe('Next Question');
    });

    it('returns "End Round" when isLastQuestion', () => {
      const result = getNavButtonLabels('question_closed', lastQuestionNotLastRoundCtx);
      expect(result.forward).toBe('End Round');
    });
  });

  describe('answer_reveal — context-dependent forward', () => {
    it('returns "Next Answer" when !isLastQuestion', () => {
      const result = getNavButtonLabels('answer_reveal', notLastCtx);
      expect(result.forward).toBe('Next Answer');
    });

    it('returns "Round Recap" when isLastQuestion && !isLastRound', () => {
      const result = getNavButtonLabels('answer_reveal', lastQuestionNotLastRoundCtx);
      expect(result.forward).toBe('Round Recap');
    });

    it('returns "End Game" when isLastQuestion && isLastRound', () => {
      const result = getNavButtonLabels('answer_reveal', lastQuestionLastRoundCtx);
      expect(result.forward).toBe('End Game');
    });
  });

  describe('recap_qa — context-dependent forward', () => {
    it('returns "Show Answer" when !recapShowingAnswer', () => {
      const ctx: NavLabelContext = { ...defaultCtx, recapShowingAnswer: false };
      const result = getNavButtonLabels('recap_qa', ctx);
      expect(result.forward).toBe('Show Answer');
    });

    it('returns "Show Answer" when recapShowingAnswer is null', () => {
      const ctx: NavLabelContext = { ...defaultCtx, recapShowingAnswer: null };
      const result = getNavButtonLabels('recap_qa', ctx);
      expect(result.forward).toBe('Show Answer');
    });

    it('returns "Next Question" when recapShowingAnswer && !isLastQuestion', () => {
      const ctx: NavLabelContext = {
        isLastQuestion: false,
        isLastRound: false,
        recapShowingAnswer: true,
      };
      const result = getNavButtonLabels('recap_qa', ctx);
      expect(result.forward).toBe('Next Question');
    });

    it('returns "View Scores" when recapShowingAnswer && isLastQuestion', () => {
      const ctx: NavLabelContext = {
        isLastQuestion: true,
        isLastRound: false,
        recapShowingAnswer: true,
      };
      const result = getNavButtonLabels('recap_qa', ctx);
      expect(result.forward).toBe('View Scores');
    });
  });

  describe('recap_scores — context-dependent forward', () => {
    it('returns "Next Round" when !isLastRound', () => {
      const result = getNavButtonLabels('recap_scores', notLastCtx);
      expect(result.forward).toBe('Next Round');
    });

    it('returns "End Game" when isLastRound', () => {
      const result = getNavButtonLabels('recap_scores', lastRoundCtx);
      expect(result.forward).toBe('End Game');
    });
  });

  describe('back labels', () => {
    it.each<[AudienceScene, string | null]>([
      ['recap_title', 'Scores'],
      ['recap_qa', 'Previous'],
      ['recap_scores', 'Q&A Review'],
      // All other scenes return null for back
      ['waiting', null],
      ['game_intro', null],
      ['round_intro', null],
      ['question_anticipation', null],
      ['question_display', null],
      ['question_closed', null],
      ['answer_reveal', null],
      ['round_summary', null],
      ['final_buildup', null],
      ['final_podium', null],
      ['paused', null],
      ['emergency_blank', null],
    ])('%s back label = %s', (scene, expectedBack) => {
      const result = getNavButtonLabels(scene, defaultCtx);
      expect(result.back).toBe(expectedBack);
    });
  });

  describe('return type', () => {
    it('returns an object with forward and back properties', () => {
      const result: NavButtonLabels = getNavButtonLabels('waiting', defaultCtx);
      expect(result).toHaveProperty('forward');
      expect(result).toHaveProperty('back');
    });

    it('null means structurally disabled — not a string', () => {
      const result = getNavButtonLabels('final_podium', defaultCtx);
      expect(result.forward).toBeNull();
      expect(result.back).toBeNull();
    });
  });
});

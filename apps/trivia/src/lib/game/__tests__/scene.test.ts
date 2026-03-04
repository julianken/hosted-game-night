import { describe, it, expect } from 'vitest';
import {
  getNextScene,
  SCENE_TRIGGERS,
  deriveSceneFromStatus,
  isSceneValidForStatus,
} from '../scene';
import { VALID_SCENES_BY_STATUS } from '@/types/audience-scene';

// =============================================================================
// RECAP SCENE TRANSITIONS (WU-02)
// =============================================================================

describe('getNextScene — recap flow transitions', () => {
  // -------------------------------------------------------------------------
  // round_summary -> recap_title (changed from answer_reveal)
  // -------------------------------------------------------------------------

  it('round_summary + advance -> recap_title', () => {
    const result = getNextScene('round_summary', SCENE_TRIGGERS.ADVANCE, {});
    expect(result).toBe('recap_title');
  });

  // -------------------------------------------------------------------------
  // recap_title transitions
  // -------------------------------------------------------------------------

  it('recap_title + advance -> recap_qa', () => {
    const result = getNextScene('recap_title', SCENE_TRIGGERS.ADVANCE, {});
    expect(result).toBe('recap_qa');
  });

  it('recap_title + next_round -> round_intro (not last round)', () => {
    const result = getNextScene('recap_title', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: false,
    });
    expect(result).toBe('round_intro');
  });

  it('recap_title + next_round -> final_buildup (last round)', () => {
    const result = getNextScene('recap_title', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: true,
    });
    expect(result).toBe('final_buildup');
  });

  // -------------------------------------------------------------------------
  // recap_qa transitions
  // -------------------------------------------------------------------------

  it('recap_qa + advance -> recap_scores', () => {
    const result = getNextScene('recap_qa', SCENE_TRIGGERS.ADVANCE, {});
    expect(result).toBe('recap_scores');
  });

  it('recap_qa + skip -> recap_scores', () => {
    const result = getNextScene('recap_qa', SCENE_TRIGGERS.SKIP, {});
    expect(result).toBe('recap_scores');
  });

  it('recap_qa + next_round -> round_intro (not last round)', () => {
    const result = getNextScene('recap_qa', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: false,
    });
    expect(result).toBe('round_intro');
  });

  it('recap_qa + next_round -> final_buildup (last round)', () => {
    const result = getNextScene('recap_qa', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: true,
    });
    expect(result).toBe('final_buildup');
  });

  // -------------------------------------------------------------------------
  // recap_scores transitions
  // -------------------------------------------------------------------------

  it('recap_scores + advance -> round_intro (not last round)', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.ADVANCE, {
      isLastRound: false,
    });
    expect(result).toBe('round_intro');
  });

  it('recap_scores + advance -> final_buildup (last round)', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.ADVANCE, {
      isLastRound: true,
    });
    expect(result).toBe('final_buildup');
  });

  it('recap_scores + next_round -> round_intro (not last round)', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: false,
    });
    expect(result).toBe('round_intro');
  });

  it('recap_scores + next_round -> final_buildup (last round)', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: true,
    });
    expect(result).toBe('final_buildup');
  });

  // -------------------------------------------------------------------------
  // Invalid / no-op triggers on recap scenes
  // -------------------------------------------------------------------------

  it('recap_title + auto -> null (no auto-advance)', () => {
    const result = getNextScene('recap_title', SCENE_TRIGGERS.AUTO, {});
    expect(result).toBeNull();
  });

  it('recap_qa + auto -> null (no auto-advance)', () => {
    const result = getNextScene('recap_qa', SCENE_TRIGGERS.AUTO, {});
    expect(result).toBeNull();
  });

  it('recap_scores + skip -> null (no skip)', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.SKIP, {});
    expect(result).toBeNull();
  });
});

// =============================================================================
// BACK TRIGGER (WU-02)
// =============================================================================

describe('SCENE_TRIGGERS.BACK', () => {
  it('is defined as "back"', () => {
    expect(SCENE_TRIGGERS.BACK).toBe('back');
  });

  it('recap_title + back -> round_summary', () => {
    const result = getNextScene('recap_title', SCENE_TRIGGERS.BACK, {});
    expect(result).toBe('round_summary');
  });

  it('recap_scores + back -> recap_qa', () => {
    const result = getNextScene('recap_scores', SCENE_TRIGGERS.BACK, {});
    expect(result).toBe('recap_qa');
  });
});

// =============================================================================
// VALID_SCENES_BY_STATUS — recap scenes in between_rounds
// =============================================================================

describe('VALID_SCENES_BY_STATUS — recap scenes', () => {
  it('between_rounds includes recap_title', () => {
    expect(VALID_SCENES_BY_STATUS.between_rounds.has('recap_title')).toBe(true);
  });

  it('between_rounds includes recap_qa', () => {
    expect(VALID_SCENES_BY_STATUS.between_rounds.has('recap_qa')).toBe(true);
  });

  it('between_rounds includes recap_scores', () => {
    expect(VALID_SCENES_BY_STATUS.between_rounds.has('recap_scores')).toBe(true);
  });

  it('isSceneValidForStatus accepts recap scenes in between_rounds', () => {
    expect(isSceneValidForStatus('recap_title', 'between_rounds')).toBe(true);
    expect(isSceneValidForStatus('recap_qa', 'between_rounds')).toBe(true);
    expect(isSceneValidForStatus('recap_scores', 'between_rounds')).toBe(true);
  });

  it('isSceneValidForStatus rejects recap scenes in playing', () => {
    expect(isSceneValidForStatus('recap_title', 'playing')).toBe(false);
    expect(isSceneValidForStatus('recap_qa', 'playing')).toBe(false);
    expect(isSceneValidForStatus('recap_scores', 'playing')).toBe(false);
  });
});

// =============================================================================
// EXISTING TRANSITIONS — verify unchanged behavior
// =============================================================================

describe('getNextScene — existing transitions (regression)', () => {
  it('round_summary + next_round -> round_intro (not last round)', () => {
    const result = getNextScene('round_summary', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: false,
    });
    expect(result).toBe('round_intro');
  });

  it('round_summary + next_round -> final_buildup (last round)', () => {
    const result = getNextScene('round_summary', SCENE_TRIGGERS.NEXT_ROUND, {
      isLastRound: true,
    });
    expect(result).toBe('final_buildup');
  });

  it('deriveSceneFromStatus(between_rounds) -> round_summary', () => {
    expect(deriveSceneFromStatus('between_rounds')).toBe('round_summary');
  });
});

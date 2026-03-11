import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoundScoringPanel } from '../RoundScoringPanel';
import type { Team } from '@/types';

function createTeam(
  id: string,
  name: string,
  score: number,
  roundScores: number[] = [score],
): Team {
  return {
    id: id as import('@joolie-boolie/types/branded').TeamId,
    name,
    score,
    tableNumber: parseInt(id, 10) || 1,
    roundScores,
  };
}

const mockTeams: Team[] = [
  createTeam('team-1', 'Table 1', 10),
  createTeam('team-2', 'Table 2', 5),
  createTeam('team-3', 'Table 3', 8),
];

describe('RoundScoringPanel', () => {
  it('should render the round number in header', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    expect(screen.getByText('Round 2 Scoring')).toBeTruthy();
  });

  it('should render a score input for each team', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Score for Table 1')).toBeTruthy();
    expect(screen.getByLabelText('Score for Table 2')).toBeTruthy();
    expect(screen.getByLabelText('Score for Table 3')).toBeTruthy();
  });

  it('should show progress counter', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    expect(screen.getByText('0/3 entered')).toBeTruthy();
  });

  it('should update progress when scores are entered', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Score for Table 1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });

    expect(screen.getByText('1/3 entered')).toBeTruthy();
  });

  it('should call onSubmitScores with entered values on Done click', () => {
    const onSubmit = vi.fn();
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={onSubmit}
      />,
    );

    // Enter scores for all teams
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Score for Table 2'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Score for Table 3'), {
      target: { value: '7' },
    });

    // Click Done
    fireEvent.click(screen.getByText('Done'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const args = onSubmit.mock.calls[0][0];
    expect(args['team-1']).toBe(5);
    expect(args['team-2']).toBe(3);
    expect(args['team-3']).toBe(7);
  });

  it('should submit 0 for teams with no entry', () => {
    const onSubmit = vi.fn();
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={onSubmit}
      />,
    );

    // Only enter one score
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });

    // Click Done without entering the others
    fireEvent.click(screen.getByText('Done'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const args = onSubmit.mock.calls[0][0];
    expect(args['team-1']).toBe(5);
    expect(args['team-2']).toBe(0);
    expect(args['team-3']).toBe(0);
  });

  it('should show Clear button only when entries exist', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    // No Clear button initially
    expect(screen.queryByText('Clear')).toBeNull();

    // Enter a score
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });

    // Clear button should appear
    expect(screen.getByText('Clear')).toBeTruthy();
  });

  it('should clear all entries when Clear is clicked', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    // Enter scores
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('Score for Table 2'), {
      target: { value: '3' },
    });

    expect(screen.getByText('2/3 entered')).toBeTruthy();

    // Click Clear
    fireEvent.click(screen.getByText('Clear'));

    expect(screen.getByText('0/3 entered')).toBeTruthy();
    expect(
      (screen.getByLabelText('Score for Table 1') as HTMLInputElement).value,
    ).toBe('');
  });

  it('should show Undo button when entries exist', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    // No Undo button initially
    expect(screen.queryByText('Undo')).toBeNull();

    // Enter a score
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });

    // Undo button should appear
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('should undo the last entry when Undo is clicked', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    // Enter a score
    fireEvent.change(screen.getByLabelText('Score for Table 1'), {
      target: { value: '5' },
    });
    expect(screen.getByText('1/3 entered')).toBeTruthy();

    // Click Undo
    fireEvent.click(screen.getByText('Undo'));

    expect(screen.getByText('0/3 entered')).toBeTruthy();
    expect(
      (screen.getByLabelText('Score for Table 1') as HTMLInputElement).value,
    ).toBe('');
  });

  it('should have accessible touch targets (min 44px)', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={1}
        onSubmitScores={vi.fn()}
      />,
    );

    // Check all score inputs have minHeight 44px
    const inputs = [
      screen.getByLabelText('Score for Table 1'),
      screen.getByLabelText('Score for Table 2'),
      screen.getByLabelText('Score for Table 3'),
    ];

    for (const input of inputs) {
      expect(input.style.minHeight).toBe('44px');
    }
  });

  // =========================================================================
  // hideHeader prop
  // =========================================================================

  describe('hideHeader prop', () => {
    it('hides visible heading when hideHeader is true', () => {
      render(
        <RoundScoringPanel
          teams={mockTeams}
          currentRound={1}
          onSubmitScores={vi.fn()}
          hideHeader
        />,
      );

      expect(screen.queryByText('Round 2 Scoring')).toBeNull();
    });

    it('preserves sr-only aria-live counter when hideHeader is true', () => {
      render(
        <RoundScoringPanel
          teams={mockTeams}
          currentRound={1}
          onSubmitScores={vi.fn()}
          hideHeader
        />,
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
    });

    it('shows visible heading when hideHeader is false (default)', () => {
      render(
        <RoundScoringPanel
          teams={mockTeams}
          currentRound={1}
          onSubmitScores={vi.fn()}
        />,
      );

      expect(screen.getByText('Round 2 Scoring')).toBeTruthy();
    });
  });

  // =========================================================================
  // Pre-fill with quick-score values (BEA-666)
  // =========================================================================

  describe('pre-fill with quick-score values', () => {
    // Teams with round 0 scores of [3], [0], and no round 1 score
    const teamsWithQuickScores: Team[] = [
      createTeam('team-a', 'Alpha', 8, [3, 5]),   // round 0=3, round 1=5
      createTeam('team-b', 'Beta', 2, [2]),        // round 0=2, round 1=undefined
      createTeam('team-c', 'Gamma', 0, [0, 0]),    // round 0=0, round 1=0
    ];

    it('should pre-fill inputs with quick-score values from team.roundScores[currentRound]', () => {
      render(
        <RoundScoringPanel
          teams={teamsWithQuickScores}
          currentRound={0}
          onSubmitScores={vi.fn()}
        />,
      );

      // Alpha has roundScores[0]=3, should be pre-filled
      expect(
        (screen.getByLabelText('Score for Alpha') as HTMLInputElement).value,
      ).toBe('3');

      // Beta has roundScores[0]=2, should be pre-filled
      expect(
        (screen.getByLabelText('Score for Beta') as HTMLInputElement).value,
      ).toBe('2');

      // Gamma has roundScores[0]=0, treated as blank
      expect(
        (screen.getByLabelText('Score for Gamma') as HTMLInputElement).value,
      ).toBe('');
    });

    it('should show correct entered count reflecting pre-filled values', () => {
      render(
        <RoundScoringPanel
          teams={teamsWithQuickScores}
          currentRound={0}
          onSubmitScores={vi.fn()}
        />,
      );

      // Alpha (3) and Beta (2) are pre-filled, Gamma (0) is not
      expect(screen.getByText('2/3 entered')).toBeTruthy();
    });

    it('should call onProgressChange with pre-filled values on mount', () => {
      const onProgress = vi.fn();
      render(
        <RoundScoringPanel
          teams={teamsWithQuickScores}
          currentRound={0}
          onSubmitScores={vi.fn()}
          onProgressChange={onProgress}
        />,
      );

      // onProgressChange should be called with the pre-filled entries
      expect(onProgress).toHaveBeenCalled();
      const progressArg = onProgress.mock.calls[0][0];
      expect(progressArg['team-a']).toBe(3);
      expect(progressArg['team-b']).toBe(2);
      expect(progressArg['team-c']).toBeUndefined();
    });

    it('should submit pre-filled values on Done without modification', () => {
      const onSubmit = vi.fn();
      render(
        <RoundScoringPanel
          teams={teamsWithQuickScores}
          currentRound={0}
          onSubmitScores={onSubmit}
        />,
      );

      // Click Done immediately without changing anything
      fireEvent.click(screen.getByText('Done'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const args = onSubmit.mock.calls[0][0];
      expect(args['team-a']).toBe(3);
      expect(args['team-b']).toBe(2);
      expect(args['team-c']).toBe(0); // null entries submit as 0
    });

    it('handleClear resets to null, not pre-fill values', () => {
      render(
        <RoundScoringPanel
          teams={teamsWithQuickScores}
          currentRound={0}
          onSubmitScores={vi.fn()}
        />,
      );

      // Pre-filled: Alpha=3, Beta=2 → 2/3 entered
      expect(screen.getByText('2/3 entered')).toBeTruthy();

      // Click Clear
      fireEvent.click(screen.getByText('Clear'));

      // All inputs should be empty
      expect(screen.getByText('0/3 entered')).toBeTruthy();
      expect(
        (screen.getByLabelText('Score for Alpha') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Score for Beta') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Score for Gamma') as HTMLInputElement).value,
      ).toBe('');
    });

    it('full quick-score + pre-fill + modify + Done sequence', () => {
      const onSubmit = vi.fn();
      // Simulate: round 1, Alpha has 5 from quick-score, Beta has nothing
      const teamsRound1: Team[] = [
        createTeam('team-a', 'Alpha', 8, [3, 5]),   // round 1=5
        createTeam('team-b', 'Beta', 2, [2]),        // round 1=undefined
        createTeam('team-c', 'Gamma', 0, [0, 0]),    // round 1=0
      ];

      render(
        <RoundScoringPanel
          teams={teamsRound1}
          currentRound={1}
          onSubmitScores={onSubmit}
        />,
      );

      // Alpha should be pre-filled with 5
      expect(
        (screen.getByLabelText('Score for Alpha') as HTMLInputElement).value,
      ).toBe('5');

      // Beta should be empty (roundScores[1] is undefined)
      expect(
        (screen.getByLabelText('Score for Beta') as HTMLInputElement).value,
      ).toBe('');

      // Gamma should be empty (roundScores[1] is 0, treated as blank)
      expect(
        (screen.getByLabelText('Score for Gamma') as HTMLInputElement).value,
      ).toBe('');

      // Modify Alpha's score
      fireEvent.change(screen.getByLabelText('Score for Alpha'), {
        target: { value: '7' },
      });

      // Enter Beta's score
      fireEvent.change(screen.getByLabelText('Score for Beta'), {
        target: { value: '4' },
      });

      // Leave Gamma empty, click Done
      fireEvent.click(screen.getByText('Done'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const args = onSubmit.mock.calls[0][0];
      expect(args['team-a']).toBe(7);  // modified from pre-fill
      expect(args['team-b']).toBe(4);  // manually entered
      expect(args['team-c']).toBe(0);  // null → 0
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoundScoringPanel } from '../RoundScoringPanel';
import type { Team } from '@/types';

function createTeam(id: string, name: string, score: number): Team {
  return {
    id: id as import('@joolie-boolie/types/branded').TeamId,
    name,
    score,
    tableNumber: parseInt(id, 10) || 1,
    roundScores: [score],
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
        currentRound={0}
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
        currentRound={0}
        onSubmitScores={vi.fn()}
      />,
    );

    expect(screen.getByText('0/3 entered')).toBeTruthy();
  });

  it('should update progress when scores are entered', () => {
    render(
      <RoundScoringPanel
        teams={mockTeams}
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
        currentRound={0}
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
});

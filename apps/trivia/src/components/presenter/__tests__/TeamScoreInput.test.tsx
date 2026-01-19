import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamScoreInput } from '../TeamScoreInput';
import type { Team } from '@/types';

// Helper to create mock teams
const createMockTeam = (
  id: string,
  name: string,
  score: number,
  tableNumber: number,
  roundScores: number[] = []
): Team => ({
  id,
  name,
  score,
  tableNumber,
  roundScores,
});

describe('TeamScoreInput', () => {
  const defaultProps = {
    teams: [],
    currentRound: 0,
    onAdjustScore: vi.fn(),
    onSetScore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Team Scores header', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 0, 1)];
      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      expect(screen.getByText('Team Scores')).toBeInTheDocument();
    });

    it('should show current round indicator', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 0, 1)];
      render(<TeamScoreInput {...defaultProps} teams={teams} currentRound={2} />);

      expect(screen.getByText('Round 3')).toBeInTheDocument();
    });

    it('should show empty state when no teams', () => {
      render(<TeamScoreInput {...defaultProps} />);

      expect(
        screen.getByText('No teams yet. Add teams to start scoring.')
      ).toBeInTheDocument();
    });

    it('should render all team names', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 10, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
      ];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('should display team scores', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 15, 1),
        createMockTeam('team-2', 'Beta', 25, 2),
      ];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('plus/minus buttons', () => {
    it('should render plus button for each team', () => {
      const teams = [
        createMockTeam('team-1', 'Table 1', 0, 1),
        createMockTeam('team-2', 'Table 2', 0, 2),
      ];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      const plusButtons = screen.getAllByTitle('Add 1 point');
      expect(plusButtons).toHaveLength(2);
    });

    it('should render minus button for each team', () => {
      const teams = [
        createMockTeam('team-1', 'Table 1', 0, 1),
        createMockTeam('team-2', 'Table 2', 0, 2),
      ];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      const minusButtons = screen.getAllByTitle('Subtract 1 point');
      expect(minusButtons).toHaveLength(2);
    });

    it('should call onAdjustScore with +1 when plus button clicked', () => {
      const onAdjustScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput
          {...defaultProps}
          teams={teams}
          onAdjustScore={onAdjustScore}
        />
      );

      const plusButton = screen.getByTitle('Add 1 point');
      fireEvent.click(plusButton);

      expect(onAdjustScore).toHaveBeenCalledWith('team-1', 1);
    });

    it('should call onAdjustScore with -1 when minus button clicked', () => {
      const onAdjustScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput
          {...defaultProps}
          teams={teams}
          onAdjustScore={onAdjustScore}
        />
      );

      const minusButton = screen.getByTitle('Subtract 1 point');
      fireEvent.click(minusButton);

      expect(onAdjustScore).toHaveBeenCalledWith('team-1', -1);
    });

    it('should call correct team id when adjusting score', () => {
      const onAdjustScore = vi.fn();
      const teams = [
        createMockTeam('team-1', 'Table 1', 10, 1),
        createMockTeam('team-2', 'Table 2', 20, 2),
      ];

      render(
        <TeamScoreInput
          {...defaultProps}
          teams={teams}
          onAdjustScore={onAdjustScore}
        />
      );

      // Click plus on second team
      const plusButtons = screen.getAllByTitle('Add 1 point');
      fireEvent.click(plusButtons[1]);

      expect(onAdjustScore).toHaveBeenCalledWith('team-2', 1);
    });
  });

  describe('direct score input', () => {
    it('should show score as clickable button', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 42, 1)];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      const scoreButton = screen.getByTitle('Click to edit total score');
      expect(scoreButton).toHaveTextContent('42');
    });

    it('should show input field when score is clicked', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 42, 1)];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(42);
    });

    it('should call onSetScore when Enter is pressed', () => {
      const onSetScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput {...defaultProps} teams={teams} onSetScore={onSetScore} />
      );

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '50' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSetScore).toHaveBeenCalledWith('team-1', 50);
    });

    it('should call onSetScore when input loses focus', () => {
      const onSetScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput {...defaultProps} teams={teams} onSetScore={onSetScore} />
      );

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '75' } });
      fireEvent.blur(input);

      expect(onSetScore).toHaveBeenCalledWith('team-1', 75);
    });

    it('should cancel edit when Escape is pressed', () => {
      const onSetScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput {...defaultProps} teams={teams} onSetScore={onSetScore} />
      );

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // onSetScore should not be called
      expect(onSetScore).not.toHaveBeenCalled();
      // Input should be gone
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('should not call onSetScore with invalid number', () => {
      const onSetScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput {...defaultProps} teams={teams} onSetScore={onSetScore} />
      );

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Empty value should not trigger onSetScore
      expect(onSetScore).not.toHaveBeenCalled();
    });

    it('should accept zero as a valid score', () => {
      const onSetScore = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      render(
        <TeamScoreInput {...defaultProps} teams={teams} onSetScore={onSetScore} />
      );

      const scoreButton = screen.getByTitle('Click to edit total score');
      fireEvent.click(scoreButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSetScore).toHaveBeenCalledWith('team-1', 0);
    });
  });

  describe('round scores breakdown', () => {
    it('should display per-round scores when available', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 15, 1, [5, 10])];

      render(<TeamScoreInput {...defaultProps} teams={teams} currentRound={1} />);

      expect(screen.getByText('Per round:')).toBeInTheDocument();
      expect(screen.getByText('R1: 5')).toBeInTheDocument();
      expect(screen.getByText('R2: 10')).toBeInTheDocument();
    });

    it('should highlight current round score', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 15, 1, [5, 10])];

      const { container } = render(
        <TeamScoreInput {...defaultProps} teams={teams} currentRound={1} />
      );

      // Current round (index 1 = R2) should have blue styling
      const currentRoundScore = container.querySelector('.bg-blue-500\\/20');
      expect(currentRoundScore).toBeInTheDocument();
    });

    it('should not show breakdown when no round scores', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 0, 1, [])];

      render(<TeamScoreInput {...defaultProps} teams={teams} />);

      expect(screen.queryByText('Per round:')).not.toBeInTheDocument();
    });

    it('should show "This round" score indicator for rounds after first', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 25, 1, [10, 15])];

      render(<TeamScoreInput {...defaultProps} teams={teams} currentRound={1} />);

      expect(screen.getByText(/This round:/)).toBeInTheDocument();
    });
  });

  describe('multiple teams', () => {
    it('should handle adjusting scores for different teams', () => {
      const onAdjustScore = vi.fn();
      const teams = [
        createMockTeam('team-1', 'Alpha', 10, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
        createMockTeam('team-3', 'Gamma', 30, 3),
      ];

      render(
        <TeamScoreInput
          {...defaultProps}
          teams={teams}
          onAdjustScore={onAdjustScore}
        />
      );

      const plusButtons = screen.getAllByTitle('Add 1 point');
      const minusButtons = screen.getAllByTitle('Subtract 1 point');

      fireEvent.click(plusButtons[0]); // Alpha +1
      fireEvent.click(minusButtons[1]); // Beta -1
      fireEvent.click(plusButtons[2]); // Gamma +1

      expect(onAdjustScore).toHaveBeenCalledWith('team-1', 1);
      expect(onAdjustScore).toHaveBeenCalledWith('team-2', -1);
      expect(onAdjustScore).toHaveBeenCalledWith('team-3', 1);
    });
  });

  describe('score display', () => {
    it('should update displayed score when team score changes', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];

      const { rerender } = render(
        <TeamScoreInput {...defaultProps} teams={teams} />
      );

      expect(screen.getByText('10')).toBeInTheDocument();

      const updatedTeams = [createMockTeam('team-1', 'Table 1', 25, 1)];
      rerender(<TeamScoreInput {...defaultProps} teams={updatedTeams} />);

      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudienceScoreboard } from '../AudienceScoreboard';
import type { Team } from '@/types';

// Helper to create mock teams
const createMockTeam = (
  id: string,
  name: string,
  score: number,
  tableNumber: number
): Team => ({
  id,
  name,
  score,
  tableNumber,
  roundScores: [],
});

describe('AudienceScoreboard', () => {
  const defaultProps = {
    teams: [],
    currentRound: 0,
    totalRounds: 3,
  };

  describe('rendering', () => {
    it('should show round complete message', () => {
      render(<AudienceScoreboard {...defaultProps} currentRound={0} />);

      expect(screen.getByText('Round 1 Complete!')).toBeInTheDocument();
    });

    it('should show remaining rounds count', () => {
      render(
        <AudienceScoreboard {...defaultProps} currentRound={0} totalRounds={3} />
      );

      expect(screen.getByText('2 rounds remaining')).toBeInTheDocument();
    });

    it('should show singular "round" when 1 remaining', () => {
      render(
        <AudienceScoreboard {...defaultProps} currentRound={1} totalRounds={3} />
      );

      expect(screen.getByText('1 round remaining')).toBeInTheDocument();
    });

    it('should show "No teams yet" when empty', () => {
      render(<AudienceScoreboard {...defaultProps} />);

      expect(screen.getByText('No teams yet')).toBeInTheDocument();
    });
  });

  describe('final round', () => {
    it('should show "Final Round Complete!" for last round', () => {
      render(
        <AudienceScoreboard {...defaultProps} currentRound={2} totalRounds={3} />
      );

      expect(screen.getByText('Final Round Complete!')).toBeInTheDocument();
    });

    it('should show "Final Standings" for last round', () => {
      render(
        <AudienceScoreboard {...defaultProps} currentRound={2} totalRounds={3} />
      );

      expect(screen.getByText('Final Standings')).toBeInTheDocument();
    });

    it('should not show "Next round starting soon" on final round', () => {
      render(
        <AudienceScoreboard {...defaultProps} currentRound={2} totalRounds={3} />
      );

      expect(
        screen.queryByText('Next round starting soon...')
      ).not.toBeInTheDocument();
    });
  });

  describe('team display', () => {
    it('should render all team names', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
        createMockTeam('team-3', 'Gamma', 10, 3),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('should render all team scores', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('ranking and sorting', () => {
    it('should display teams in order passed (assumes pre-sorted)', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      const teamNames = screen.getAllByText(/^(First|Second|Third)$/);
      expect(teamNames[0]).toHaveTextContent('First');
      expect(teamNames[1]).toHaveTextContent('Second');
      expect(teamNames[2]).toHaveTextContent('Third');
    });
  });

  describe('medal badges for top 3', () => {
    it('should show 1st medal for first place', () => {
      const teams = [createMockTeam('team-1', 'Winner', 50, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('1st')).toBeInTheDocument();
    });

    it('should show 2nd medal for second place', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('2nd')).toBeInTheDocument();
    });

    it('should show 3rd medal for third place', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('3rd')).toBeInTheDocument();
    });

    it('should show numeric rank for 4th place and beyond', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
        createMockTeam('team-4', 'Fourth', 20, 4),
      ];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should style gold medal correctly', () => {
      const teams = [createMockTeam('team-1', 'Winner', 50, 1)];

      const { container } = render(
        <AudienceScoreboard {...defaultProps} teams={teams} />
      );

      const goldMedal = container.querySelector('.bg-yellow-500');
      expect(goldMedal).toBeInTheDocument();
    });

    it('should style silver medal correctly', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
      ];

      const { container } = render(
        <AudienceScoreboard {...defaultProps} teams={teams} />
      );

      const silverMedal = container.querySelector('.bg-gray-400');
      expect(silverMedal).toBeInTheDocument();
    });

    it('should style bronze medal correctly', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
      ];

      const { container } = render(
        <AudienceScoreboard {...defaultProps} teams={teams} />
      );

      const bronzeMedal = container.querySelector('.bg-amber-700');
      expect(bronzeMedal).toBeInTheDocument();
    });
  });

  describe('large, readable fonts', () => {
    it('should have large header text', () => {
      render(<AudienceScoreboard {...defaultProps} />);

      const header = screen.getByText('Round 1 Complete!');
      expect(header).toHaveClass('text-4xl');
    });

    it('should have large team name text', () => {
      const teams = [createMockTeam('team-1', 'Big Team', 50, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      const teamName = screen.getByText('Big Team');
      expect(teamName).toHaveClass('text-2xl');
    });

    it('should have large score text', () => {
      const teams = [createMockTeam('team-1', 'Team', 100, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      const score = screen.getByText('100');
      expect(score).toHaveClass('text-3xl');
    });
  });

  describe('next round indicator', () => {
    it('should show next round message when not final round', () => {
      const teams = [createMockTeam('team-1', 'Team', 50, 1)];

      render(
        <AudienceScoreboard
          {...defaultProps}
          teams={teams}
          currentRound={0}
          totalRounds={3}
        />
      );

      expect(screen.getByText('Next round starting soon...')).toBeInTheDocument();
    });

    it('should have pulsing animation on next round message', () => {
      const teams = [createMockTeam('team-1', 'Team', 50, 1)];

      render(
        <AudienceScoreboard
          {...defaultProps}
          teams={teams}
          currentRound={0}
          totalRounds={3}
        />
      );

      const nextRoundMessage = screen.getByText('Next round starting soon...');
      expect(nextRoundMessage).toHaveClass('animate-pulse');
    });
  });

  describe('layout', () => {
    it('should have fade-in animation', () => {
      const { container } = render(<AudienceScoreboard {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('animate-in');
      expect(wrapper).toHaveClass('fade-in');
    });

    it('should have minimum height', () => {
      const { container } = render(<AudienceScoreboard {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-[60vh]');
    });

    it('should be centered', () => {
      const { container } = render(<AudienceScoreboard {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('items-center');
    });
  });

  describe('column headers', () => {
    it('should display Rank header', () => {
      const teams = [createMockTeam('team-1', 'Team', 50, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('Rank')).toBeInTheDocument();
    });

    it('should display Team header', () => {
      const teams = [createMockTeam('team-1', 'Test', 50, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    it('should display Score header', () => {
      const teams = [createMockTeam('team-1', 'Test', 50, 1)];

      render(<AudienceScoreboard {...defaultProps} teams={teams} />);

      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });

  describe('smooth updates', () => {
    it('should update scores when props change', () => {
      const initialTeams = [createMockTeam('team-1', 'Team', 10, 1)];

      const { rerender } = render(
        <AudienceScoreboard {...defaultProps} teams={initialTeams} />
      );

      expect(screen.getByText('10')).toBeInTheDocument();

      const updatedTeams = [createMockTeam('team-1', 'Team', 25, 1)];
      rerender(<AudienceScoreboard {...defaultProps} teams={updatedTeams} />);

      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should update rankings when order changes', () => {
      const initialTeams = [
        createMockTeam('team-1', 'Alpha', 50, 1),
        createMockTeam('team-2', 'Beta', 40, 2),
      ];

      const { rerender } = render(
        <AudienceScoreboard {...defaultProps} teams={initialTeams} />
      );

      // Initially Alpha is first
      let teamNames = screen.getAllByText(/^(Alpha|Beta)$/);
      expect(teamNames[0]).toHaveTextContent('Alpha');

      // Update with Beta now first
      const updatedTeams = [
        createMockTeam('team-2', 'Beta', 60, 2),
        createMockTeam('team-1', 'Alpha', 50, 1),
      ];
      rerender(<AudienceScoreboard {...defaultProps} teams={updatedTeams} />);

      teamNames = screen.getAllByText(/^(Alpha|Beta)$/);
      expect(teamNames[0]).toHaveTextContent('Beta');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamScoreboard } from '../TeamScoreboard';
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

describe('TeamScoreboard', () => {
  describe('rendering', () => {
    it('should render Scoreboard header', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 10, 1)];
      render(<TeamScoreboard teams={teams} />);

      expect(screen.getByText('Scoreboard')).toBeInTheDocument();
    });

    it('should show empty state when no teams', () => {
      render(<TeamScoreboard teams={[]} />);

      expect(screen.getByText('No teams yet')).toBeInTheDocument();
    });

    it('should render all team names', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
        createMockTeam('team-3', 'Gamma', 10, 3),
      ];

      render(<TeamScoreboard teams={teams} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('should render all team scores', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
      ];

      render(<TeamScoreboard teams={teams} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('sorting by score', () => {
    it('should sort teams by score in descending order', () => {
      const teams = [
        createMockTeam('team-1', 'Low', 10, 1),
        createMockTeam('team-2', 'High', 50, 2),
        createMockTeam('team-3', 'Mid', 30, 3),
      ];

      render(<TeamScoreboard teams={teams} />);

      const teamNames = screen.getAllByText(/^(Low|High|Mid)$/);
      expect(teamNames[0]).toHaveTextContent('High');
      expect(teamNames[1]).toHaveTextContent('Mid');
      expect(teamNames[2]).toHaveTextContent('Low');
    });
  });

  describe('ranks', () => {
    it('should display rank numbers', () => {
      const teams = [
        createMockTeam('team-1', 'First', 30, 1),
        createMockTeam('team-2', 'Second', 20, 2),
        createMockTeam('team-3', 'Third', 10, 3),
      ];

      render(<TeamScoreboard teams={teams} />);

      // Ranks 1, 2, 3 should be displayed
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle ties correctly - same rank for same score', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 30, 2), // Tied with Alpha
        createMockTeam('team-3', 'Gamma', 10, 3),
      ];

      render(<TeamScoreboard teams={teams} />);

      // Both Alpha and Beta should have rank 1
      const rankOnes = screen.getAllByText('1');
      expect(rankOnes).toHaveLength(2);
    });

    it('should show rank 3 for third place after a tie for first', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 30, 2),
        createMockTeam('team-3', 'Gamma', 10, 3),
      ];

      render(<TeamScoreboard teams={teams} />);

      // Gamma should have rank 3 (not 2, because two teams are tied for 1st)
      // The rank displayed for Gamma depends on implementation
      // According to the code, it finds first team with same score
      // So Gamma would be index 2 with rank 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('place highlighting', () => {
    it('should highlight 1st place with gold styling when score > 0', () => {
      const teams = [
        createMockTeam('team-1', 'Winner', 50, 1),
        createMockTeam('team-2', 'Second', 30, 2),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      // 1st place should have yellow/gold styling
      const firstPlaceRow = container.querySelector('.border-yellow-500');
      expect(firstPlaceRow).toBeInTheDocument();
    });

    it('should highlight 2nd place with silver styling when score > 0', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 30, 2),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      // 2nd place should have gray styling
      const secondPlaceRow = container.querySelector('.border-gray-400');
      expect(secondPlaceRow).toBeInTheDocument();
    });

    it('should highlight 3rd place with bronze styling when score > 0', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 30, 2),
        createMockTeam('team-3', 'Third', 10, 3),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      // 3rd place should have orange styling
      const thirdPlaceRow = container.querySelector('.border-orange-400');
      expect(thirdPlaceRow).toBeInTheDocument();
    });

    it('should not highlight place for teams with 0 score', () => {
      const teams = [
        createMockTeam('team-1', 'First', 0, 1),
        createMockTeam('team-2', 'Second', 0, 2),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      // No gold, silver, or bronze styling should be applied
      expect(container.querySelector('.border-yellow-500')).not.toBeInTheDocument();
      expect(container.querySelector('.border-gray-400')).not.toBeInTheDocument();
      expect(container.querySelector('.border-orange-400')).not.toBeInTheDocument();
    });
  });

  describe('rank badges', () => {
    it('should show gold badge for 1st place with score > 0', () => {
      const teams = [createMockTeam('team-1', 'Winner', 50, 1)];

      const { container } = render(<TeamScoreboard teams={teams} />);

      const goldBadge = container.querySelector('.bg-yellow-500');
      expect(goldBadge).toBeInTheDocument();
    });

    it('should show gray badge for 2nd place with score > 0', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 30, 2),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      const silverBadge = container.querySelector('.bg-gray-400');
      expect(silverBadge).toBeInTheDocument();
    });

    it('should show orange badge for 3rd place with score > 0', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 30, 2),
        createMockTeam('team-3', 'Third', 10, 3),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      const bronzeBadge = container.querySelector('.bg-orange-500');
      expect(bronzeBadge).toBeInTheDocument();
    });

    it('should show muted badge for teams not in top 3', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
        createMockTeam('team-4', 'Fourth', 20, 4),
      ];

      const { container } = render(<TeamScoreboard teams={teams} />);

      const mutedBadges = container.querySelectorAll('.bg-muted');
      expect(mutedBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('score updates', () => {
    it('should re-sort when scores change', () => {
      const initialTeams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 20, 2),
      ];

      const { rerender } = render(<TeamScoreboard teams={initialTeams} />);

      // Initially Alpha is first
      let teamNames = screen.getAllByText(/^(Alpha|Beta)$/);
      expect(teamNames[0]).toHaveTextContent('Alpha');

      // Update scores - Beta now has higher score
      const updatedTeams = [
        createMockTeam('team-1', 'Alpha', 30, 1),
        createMockTeam('team-2', 'Beta', 50, 2),
      ];

      rerender(<TeamScoreboard teams={updatedTeams} />);

      // Now Beta should be first
      teamNames = screen.getAllByText(/^(Alpha|Beta)$/);
      expect(teamNames[0]).toHaveTextContent('Beta');
    });
  });

  describe('many teams', () => {
    it('should handle more than 3 teams', () => {
      const teams = [
        createMockTeam('team-1', 'First', 50, 1),
        createMockTeam('team-2', 'Second', 40, 2),
        createMockTeam('team-3', 'Third', 30, 3),
        createMockTeam('team-4', 'Fourth', 20, 4),
        createMockTeam('team-5', 'Fifth', 10, 5),
      ];

      render(<TeamScoreboard teams={teams} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
      expect(screen.getByText('Fourth')).toBeInTheDocument();
      expect(screen.getByText('Fifth')).toBeInTheDocument();
    });
  });
});

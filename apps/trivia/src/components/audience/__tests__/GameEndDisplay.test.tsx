import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameEndDisplay } from '../GameEndDisplay';
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

describe('GameEndDisplay', () => {
  describe('game over header', () => {
    it('should display "Game Over!" heading', () => {
      const teams = [createMockTeam('team-1', 'Winner', 50, 1)];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Game Over!')).toBeInTheDocument();
    });

    it('should have large heading text', () => {
      const teams = [createMockTeam('team-1', 'Winner', 50, 1)];

      render(<GameEndDisplay teams={teams} />);

      const heading = screen.getByText('Game Over!');
      expect(heading).toHaveClass('text-5xl');
    });
  });

  describe('winner display', () => {
    it('should display the winner name', () => {
      const teams = [
        createMockTeam('team-1', 'Champion Team', 100, 1),
        createMockTeam('team-2', 'Second Place', 80, 2),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Champion Team')).toBeInTheDocument();
    });

    it('should display WINNER label', () => {
      const teams = [createMockTeam('team-1', 'The Champions', 100, 1)];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('WINNER')).toBeInTheDocument();
    });

    it('should display winner score with points label', () => {
      const teams = [createMockTeam('team-1', 'Winner', 150, 1)];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('150 points')).toBeInTheDocument();
    });

    it('should display trophy emojis', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      // Check for trophy emoji
      const trophies = container.querySelectorAll('span');
      const trophyEmojis = Array.from(trophies).filter(
        (span) => span.textContent === '\uD83C\uDFC6'
      );
      expect(trophyEmojis.length).toBeGreaterThanOrEqual(2);
    });

    it('should highlight winner with special styling', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      // Winner should have gold border
      const winnerBox = container.querySelector('.border-yellow-500');
      expect(winnerBox).toBeInTheDocument();
    });
  });

  describe('runners up (2nd and 3rd place)', () => {
    it('should display second place team', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second Place Team', 80, 2),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Second Place Team')).toBeInTheDocument();
    });

    it('should display third place team', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third Place Team', 60, 3),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Third Place Team')).toBeInTheDocument();
    });

    it('should show scores for runners up', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('80 points')).toBeInTheDocument();
      expect(screen.getByText('60 points')).toBeInTheDocument();
    });

    it('should display rank badges for 2nd and 3rd', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should style 2nd place with silver', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
      ];

      const { container } = render(<GameEndDisplay teams={teams} />);

      const silverBox = container.querySelector('.border-gray-400');
      expect(silverBox).toBeInTheDocument();
    });

    it('should style 3rd place with bronze', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
      ];

      const { container } = render(<GameEndDisplay teams={teams} />);

      const bronzeBox = container.querySelector('.border-amber-700');
      expect(bronzeBox).toBeInTheDocument();
    });
  });

  describe('other participants (4th place and beyond)', () => {
    it('should display "Other Participants" header when more than 3 teams', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
        createMockTeam('team-4', 'Fourth', 40, 4),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Other Participants')).toBeInTheDocument();
    });

    it('should display 4th place team', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
        createMockTeam('team-4', 'Fourth Place Team', 40, 4),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Fourth Place Team')).toBeInTheDocument();
    });

    it('should display all teams beyond 3rd place', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
        createMockTeam('team-4', 'Fourth', 40, 4),
        createMockTeam('team-5', 'Fifth', 20, 5),
        createMockTeam('team-6', 'Sixth', 10, 6),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Fourth')).toBeInTheDocument();
      expect(screen.getByText('Fifth')).toBeInTheDocument();
      expect(screen.getByText('Sixth')).toBeInTheDocument();
    });

    it('should show rank numbers for other participants', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
        createMockTeam('team-4', 'Fourth', 40, 4),
        createMockTeam('team-5', 'Fifth', 20, 5),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('4.')).toBeInTheDocument();
      expect(screen.getByText('5.')).toBeInTheDocument();
    });

    it('should show scores for other participants', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
        createMockTeam('team-4', 'Fourth', 40, 4),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('40')).toBeInTheDocument();
    });

    it('should not show "Other Participants" when only 3 or fewer teams', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
        createMockTeam('team-3', 'Third', 60, 3),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.queryByText('Other Participants')).not.toBeInTheDocument();
    });
  });

  describe('no teams', () => {
    it('should show message when no teams', () => {
      render(<GameEndDisplay teams={[]} />);

      expect(screen.getByText('No teams participated')).toBeInTheDocument();
    });

    it('should not show winner section when no teams', () => {
      render(<GameEndDisplay teams={[]} />);

      expect(screen.queryByText('WINNER')).not.toBeInTheDocument();
    });
  });

  describe('ties handling', () => {
    it('should display tied teams correctly', () => {
      const teams = [
        createMockTeam('team-1', 'Team A', 100, 1),
        createMockTeam('team-2', 'Team B', 100, 2), // Tied for first
      ];

      render(<GameEndDisplay teams={teams} />);

      // Both teams should be displayed
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
    });

    it('should show first team as winner when tied', () => {
      const teams = [
        createMockTeam('team-1', 'First Winner', 100, 1),
        createMockTeam('team-2', 'Second Winner', 100, 2),
      ];

      render(<GameEndDisplay teams={teams} />);

      // First team in array should be shown as winner
      const winnerSection = screen.getByText('WINNER').closest('div');
      expect(winnerSection).toBeInTheDocument();
    });
  });

  describe('thank you message', () => {
    it('should display thank you message', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText(/Thanks for playing/)).toBeInTheDocument();
    });
  });

  describe('final standings', () => {
    it('should display complete standings in order', () => {
      const teams = [
        createMockTeam('team-1', 'Gold', 100, 1),
        createMockTeam('team-2', 'Silver', 80, 2),
        createMockTeam('team-3', 'Bronze', 60, 3),
        createMockTeam('team-4', 'Fourth', 40, 4),
      ];

      render(<GameEndDisplay teams={teams} />);

      // All teams should be visible
      expect(screen.getByText('Gold')).toBeInTheDocument();
      expect(screen.getByText('Silver')).toBeInTheDocument();
      expect(screen.getByText('Bronze')).toBeInTheDocument();
      expect(screen.getByText('Fourth')).toBeInTheDocument();
    });
  });

  describe('layout and animations', () => {
    it('should have fade-in animation', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('animate-in');
      expect(wrapper).toHaveClass('fade-in');
    });

    it('should have minimum height', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-[60vh]');
    });

    it('should have zoom animation on winner box', () => {
      const teams = [createMockTeam('team-1', 'Winner', 100, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      const winnerBox = container.querySelector('.animate-in.zoom-in-95');
      expect(winnerBox).toBeInTheDocument();
    });
  });

  describe('single team', () => {
    it('should handle single team correctly', () => {
      const teams = [createMockTeam('team-1', 'Only Team', 50, 1)];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Only Team')).toBeInTheDocument();
      expect(screen.getByText('WINNER')).toBeInTheDocument();
      expect(screen.getByText('50 points')).toBeInTheDocument();
    });

    it('should not show runners up section with single team', () => {
      const teams = [createMockTeam('team-1', 'Only Team', 50, 1)];

      const { container } = render(<GameEndDisplay teams={teams} />);

      // No silver or bronze boxes should exist
      expect(container.querySelector('.border-gray-400')).not.toBeInTheDocument();
      expect(container.querySelector('.border-amber-700')).not.toBeInTheDocument();
    });
  });

  describe('two teams', () => {
    it('should handle two teams correctly', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Second', 80, 2),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('should show 2nd place as runner up', () => {
      const teams = [
        createMockTeam('team-1', 'First', 100, 1),
        createMockTeam('team-2', 'Runner Up', 80, 2),
      ];

      render(<GameEndDisplay teams={teams} />);

      expect(screen.getByText('Runner Up')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamManager } from '../TeamManager';
import { MAX_TEAMS } from '@/types';
import type { Team, GameStatus } from '@/types';

// Helper to create mock teams
const createMockTeam = (id: string, name: string, tableNumber: number): Team => ({
  id,
  name,
  score: 0,
  tableNumber,
  roundScores: [],
});

describe('TeamManager', () => {
  const defaultProps = {
    teams: [],
    status: 'setup' as GameStatus,
    onAddTeam: vi.fn(),
    onRemoveTeam: vi.fn(),
    onRenameTeam: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Teams header', () => {
      render(<TeamManager {...defaultProps} />);

      expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('should show empty state message when no teams', () => {
      render(<TeamManager {...defaultProps} />);

      expect(screen.getByText('No teams added yet')).toBeInTheDocument();
    });

    it('should show team count in setup mode', () => {
      render(<TeamManager {...defaultProps} />);

      expect(screen.getByText(`0/${MAX_TEAMS}`)).toBeInTheDocument();
    });

    it('should not show team count when not in setup mode', () => {
      render(<TeamManager {...defaultProps} status="playing" />);

      expect(screen.queryByText(`0/${MAX_TEAMS}`)).not.toBeInTheDocument();
    });

    it('should show warning to add teams when empty in setup', () => {
      render(<TeamManager {...defaultProps} />);

      expect(
        screen.getByText('Add at least one team to start the game')
      ).toBeInTheDocument();
    });
  });

  describe('add team functionality', () => {
    it('should render Add Team button in setup mode', () => {
      render(<TeamManager {...defaultProps} />);

      expect(screen.getByText('Add Team')).toBeInTheDocument();
    });

    it('should call onAddTeam when Add Team button is clicked', () => {
      const onAddTeam = vi.fn();
      render(<TeamManager {...defaultProps} onAddTeam={onAddTeam} />);

      fireEvent.click(screen.getByText('Add Team'));

      expect(onAddTeam).toHaveBeenCalledTimes(1);
      expect(onAddTeam).toHaveBeenCalledWith();
    });

    it('should not render Add Team button when game is playing', () => {
      render(<TeamManager {...defaultProps} status="playing" />);

      expect(screen.queryByText('Add Team')).not.toBeInTheDocument();
    });

    it('should not render Add Team button when game has ended', () => {
      render(<TeamManager {...defaultProps} status="ended" />);

      expect(screen.queryByText('Add Team')).not.toBeInTheDocument();
    });
  });

  describe('MAX_TEAMS limit', () => {
    it('should disable Add Team button when at max teams', () => {
      const maxTeams = Array.from({ length: MAX_TEAMS }, (_, i) =>
        createMockTeam(`team-${i}`, `Table ${i + 1}`, i + 1)
      );

      render(<TeamManager {...defaultProps} teams={maxTeams} />);

      const button = screen.getByText(`Maximum Teams Reached (${MAX_TEAMS})`);
      expect(button).toBeDisabled();
    });

    it('should show maximum teams message when at limit', () => {
      const maxTeams = Array.from({ length: MAX_TEAMS }, (_, i) =>
        createMockTeam(`team-${i}`, `Table ${i + 1}`, i + 1)
      );

      render(<TeamManager {...defaultProps} teams={maxTeams} />);

      expect(
        screen.getByText(`Maximum Teams Reached (${MAX_TEAMS})`)
      ).toBeInTheDocument();
    });

    it('should update count correctly as teams are added', () => {
      const teams = [
        createMockTeam('team-1', 'Table 1', 1),
        createMockTeam('team-2', 'Table 2', 2),
      ];

      render(<TeamManager {...defaultProps} teams={teams} />);

      expect(screen.getByText(`2/${MAX_TEAMS}`)).toBeInTheDocument();
    });
  });

  describe('team list display', () => {
    it('should render all team names', () => {
      const teams = [
        createMockTeam('team-1', 'Alpha Team', 1),
        createMockTeam('team-2', 'Beta Team', 2),
        createMockTeam('team-3', 'Gamma Team', 3),
      ];

      render(<TeamManager {...defaultProps} teams={teams} />);

      expect(screen.getByText('Alpha Team')).toBeInTheDocument();
      expect(screen.getByText('Beta Team')).toBeInTheDocument();
      expect(screen.getByText('Gamma Team')).toBeInTheDocument();
    });
  });

  describe('remove team functionality', () => {
    it('should render Remove button for each team in setup mode', () => {
      const teams = [
        createMockTeam('team-1', 'Table 1', 1),
        createMockTeam('team-2', 'Table 2', 2),
      ];

      render(<TeamManager {...defaultProps} teams={teams} />);

      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons).toHaveLength(2);
    });

    it('should call onRemoveTeam with correct team id when Remove is clicked', () => {
      const onRemoveTeam = vi.fn();
      const teams = [
        createMockTeam('team-1', 'Table 1', 1),
        createMockTeam('team-2', 'Table 2', 2),
      ];

      render(
        <TeamManager {...defaultProps} teams={teams} onRemoveTeam={onRemoveTeam} />
      );

      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      expect(onRemoveTeam).toHaveBeenCalledWith('team-1');
    });

    it('should not render Remove buttons when game is playing', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(<TeamManager {...defaultProps} teams={teams} status="playing" />);

      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('rename team functionality', () => {
    it('should render Rename button for each team', () => {
      const teams = [
        createMockTeam('team-1', 'Table 1', 1),
        createMockTeam('team-2', 'Table 2', 2),
      ];

      render(<TeamManager {...defaultProps} teams={teams} />);

      const renameButtons = screen.getAllByText('Rename');
      expect(renameButtons).toHaveLength(2);
    });

    it('should show input field when Rename is clicked', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(<TeamManager {...defaultProps} teams={teams} />);

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Table 1');
    });

    it('should call onRenameTeam when Enter is pressed', () => {
      const onRenameTeam = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} onRenameTeam={onRenameTeam} />
      );

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Team Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRenameTeam).toHaveBeenCalledWith('team-1', 'New Team Name');
    });

    it('should call onRenameTeam when input loses focus', () => {
      const onRenameTeam = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} onRenameTeam={onRenameTeam} />
      );

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Blurred Name' } });
      fireEvent.blur(input);

      expect(onRenameTeam).toHaveBeenCalledWith('team-1', 'Blurred Name');
    });

    it('should cancel edit when Escape is pressed', () => {
      const onRenameTeam = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} onRenameTeam={onRenameTeam} />
      );

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Will Be Cancelled' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // onRenameTeam should not be called
      expect(onRenameTeam).not.toHaveBeenCalled();
      // Input should be gone
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should not call onRenameTeam with empty string', () => {
      const onRenameTeam = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} onRenameTeam={onRenameTeam} />
      );

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRenameTeam).not.toHaveBeenCalled();
    });

    it('should trim whitespace from team name', () => {
      const onRenameTeam = vi.fn();
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} onRenameTeam={onRenameTeam} />
      );

      fireEvent.click(screen.getByText('Rename'));

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '  Trimmed Name  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRenameTeam).toHaveBeenCalledWith('team-1', 'Trimmed Name');
    });

    it('should allow renaming even when game is playing', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(<TeamManager {...defaultProps} teams={teams} status="playing" />);

      // Rename button should still be visible
      expect(screen.getByText('Rename')).toBeInTheDocument();
    });
  });

  describe('game started state', () => {
    it('should not show Add Team button when game is playing', () => {
      render(<TeamManager {...defaultProps} status="playing" />);

      expect(screen.queryByText('Add Team')).not.toBeInTheDocument();
    });

    it('should not show Remove buttons when game is playing', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(<TeamManager {...defaultProps} teams={teams} status="playing" />);

      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('should still allow renaming when game is between rounds', () => {
      const teams = [createMockTeam('team-1', 'Table 1', 1)];

      render(
        <TeamManager {...defaultProps} teams={teams} status="between_rounds" />
      );

      expect(screen.getByText('Rename')).toBeInTheDocument();
    });
  });
});

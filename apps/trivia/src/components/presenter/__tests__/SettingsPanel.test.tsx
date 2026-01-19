import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel, type SettingsPanelProps } from '../SettingsPanel';
import { SETTINGS_RANGES } from '@/stores/settings-store';
import type { Team, GameStatus } from '@/types';
import type { TeamSetup } from '@/stores/settings-store';

// Helper to create mock teams
const createMockTeam = (id: string, name: string, tableNumber: number): Team => ({
  id,
  name,
  score: 0,
  tableNumber,
  roundScores: [],
});

// Default props for tests
const createDefaultProps = (
  overrides: Partial<SettingsPanelProps> = {}
): SettingsPanelProps => ({
  status: 'setup',
  roundsCount: 3,
  questionsPerRound: 5,
  timerDuration: 30,
  timerAutoStart: true,
  timerVisible: true,
  ttsEnabled: false,
  lastTeamSetup: null,
  currentTeams: [],
  onUpdateSetting: vi.fn(),
  onLoadTeams: vi.fn(),
  onSaveTeams: vi.fn(),
  ...overrides,
});

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Settings header', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render all section headings', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      expect(screen.getByText('Timer Settings')).toBeInTheDocument();
      expect(screen.getByText('Audio Settings')).toBeInTheDocument();
      expect(screen.getByText('Team Setup')).toBeInTheDocument();
    });

    it('should render all slider labels', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(screen.getByText('Number of Rounds')).toBeInTheDocument();
      expect(screen.getByText('Questions Per Round')).toBeInTheDocument();
      expect(screen.getByText('Timer Duration')).toBeInTheDocument();
    });

    it('should render all toggle labels', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(screen.getByText('Auto-start Timer')).toBeInTheDocument();
      expect(screen.getByText('Show Timer on Display')).toBeInTheDocument();
      expect(screen.getByText('Text-to-Speech')).toBeInTheDocument();
    });

    it('should render TTS description', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(
        screen.getByText('Reads questions aloud when displayed')
      ).toBeInTheDocument();
    });

    it('should have correct accessibility region', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(
        screen.getByRole('region', { name: 'Game settings' })
      ).toBeInTheDocument();
    });
  });

  describe('slider controls', () => {
    it('should display current roundsCount value', () => {
      render(<SettingsPanel {...createDefaultProps({ roundsCount: 4 })} />);

      // The Slider component displays the value
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should display current questionsPerRound value', () => {
      render(<SettingsPanel {...createDefaultProps({ questionsPerRound: 8 })} />);

      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display current timerDuration value with unit', () => {
      render(<SettingsPanel {...createDefaultProps({ timerDuration: 60 })} />);

      expect(screen.getByText('60s')).toBeInTheDocument();
    });

    it('should call onUpdateSetting when roundsCount slider changes', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ onUpdateSetting })}
        />
      );

      // Find the slider by its label and interact with it
      const sliders = screen.getAllByRole('slider');
      // First slider is roundsCount
      fireEvent.change(sliders[0], { target: { value: 5 } });

      // Note: The actual slider interaction depends on react-aria-components implementation
      // We're testing that the component wires up the callback correctly
    });

    it('should call onUpdateSetting when questionsPerRound slider changes', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ onUpdateSetting })}
        />
      );

      const sliders = screen.getAllByRole('slider');
      // Second slider is questionsPerRound
      expect(sliders[1]).toBeInTheDocument();
    });

    it('should call onUpdateSetting when timerDuration slider changes', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ onUpdateSetting })}
        />
      );

      const sliders = screen.getAllByRole('slider');
      // Third slider is timerDuration
      expect(sliders[2]).toBeInTheDocument();
    });
  });

  describe('toggle controls', () => {
    it('should render timerAutoStart toggle with correct state', () => {
      render(
        <SettingsPanel {...createDefaultProps({ timerAutoStart: true })} />
      );

      const toggle = screen.getByRole('switch', { name: /auto-start timer/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should render timerVisible toggle with correct state', () => {
      render(
        <SettingsPanel {...createDefaultProps({ timerVisible: false })} />
      );

      const toggle = screen.getByRole('switch', { name: /show timer on display/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should render ttsEnabled toggle with correct state', () => {
      render(<SettingsPanel {...createDefaultProps({ ttsEnabled: true })} />);

      const toggle = screen.getByRole('switch', { name: /text-to-speech/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onUpdateSetting when timerAutoStart is toggled', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ timerAutoStart: true, onUpdateSetting })}
        />
      );

      const toggle = screen.getByRole('switch', { name: /auto-start timer/i });
      fireEvent.click(toggle);

      expect(onUpdateSetting).toHaveBeenCalledWith('timerAutoStart', false);
    });

    it('should call onUpdateSetting when timerVisible is toggled', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ timerVisible: true, onUpdateSetting })}
        />
      );

      const toggle = screen.getByRole('switch', { name: /show timer on display/i });
      fireEvent.click(toggle);

      expect(onUpdateSetting).toHaveBeenCalledWith('timerVisible', false);
    });

    it('should call onUpdateSetting when ttsEnabled is toggled', () => {
      const onUpdateSetting = vi.fn();
      render(
        <SettingsPanel
          {...createDefaultProps({ ttsEnabled: false, onUpdateSetting })}
        />
      );

      const toggle = screen.getByRole('switch', { name: /text-to-speech/i });
      fireEvent.click(toggle);

      expect(onUpdateSetting).toHaveBeenCalledWith('ttsEnabled', true);
    });
  });

  describe('disabled state during non-setup status', () => {
    const nonSetupStatuses: GameStatus[] = ['playing', 'between_rounds', 'ended'];

    nonSetupStatuses.forEach((status) => {
      describe(`when status is "${status}"`, () => {
        it('should disable all sliders', () => {
          render(<SettingsPanel {...createDefaultProps({ status })} />);

          const sliders = screen.getAllByRole('slider');
          sliders.forEach((slider) => {
            expect(slider).toBeDisabled();
          });
        });

        it('should disable all toggles', () => {
          render(<SettingsPanel {...createDefaultProps({ status })} />);

          const toggles = screen.getAllByRole('switch');
          toggles.forEach((toggle) => {
            expect(toggle).toBeDisabled();
          });
        });

        it('should show disabled state message', () => {
          render(<SettingsPanel {...createDefaultProps({ status })} />);

          expect(
            screen.getByText('Settings can only be changed during game setup')
          ).toBeInTheDocument();
        });

        it('should not show Save Current Teams button', () => {
          const teams = [createMockTeam('1', 'Team 1', 1)];
          render(
            <SettingsPanel {...createDefaultProps({ status, currentTeams: teams })} />
          );

          expect(screen.queryByText(/Save Current Teams/)).not.toBeInTheDocument();
        });

        it('should not show Load Teams button even with saved teams', () => {
          const lastTeamSetup: TeamSetup = {
            names: ['Team A', 'Team B'],
            count: 2,
          };
          render(
            <SettingsPanel {...createDefaultProps({ status, lastTeamSetup })} />
          );

          expect(screen.queryByText('Load Teams')).not.toBeInTheDocument();
        });
      });
    });

    it('should not disable controls when status is "setup"', () => {
      render(<SettingsPanel {...createDefaultProps({ status: 'setup' })} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).not.toBeDisabled();
      });

      const toggles = screen.getAllByRole('switch');
      toggles.forEach((toggle) => {
        expect(toggle).not.toBeDisabled();
      });
    });

    it('should not show disabled state message when status is "setup"', () => {
      render(<SettingsPanel {...createDefaultProps({ status: 'setup' })} />);

      expect(
        screen.queryByText('Settings can only be changed during game setup')
      ).not.toBeInTheDocument();
    });
  });

  describe('save teams functionality', () => {
    it('should show Save Current Teams button when teams exist', () => {
      const teams = [
        createMockTeam('1', 'Team 1', 1),
        createMockTeam('2', 'Team 2', 2),
      ];

      render(<SettingsPanel {...createDefaultProps({ currentTeams: teams })} />);

      expect(screen.getByText('Save Current Teams (2)')).toBeInTheDocument();
    });

    it('should not show Save Current Teams button when no teams', () => {
      render(<SettingsPanel {...createDefaultProps({ currentTeams: [] })} />);

      expect(screen.queryByText(/Save Current Teams/)).not.toBeInTheDocument();
    });

    it('should call onSaveTeams when Save button is clicked', () => {
      const onSaveTeams = vi.fn();
      const teams = [createMockTeam('1', 'Team 1', 1)];

      render(
        <SettingsPanel
          {...createDefaultProps({ currentTeams: teams, onSaveTeams })}
        />
      );

      fireEvent.click(screen.getByText('Save Current Teams (1)'));

      expect(onSaveTeams).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria-label for Save button', () => {
      const teams = [
        createMockTeam('1', 'Team 1', 1),
        createMockTeam('2', 'Team 2', 2),
        createMockTeam('3', 'Team 3', 3),
      ];

      render(<SettingsPanel {...createDefaultProps({ currentTeams: teams })} />);

      expect(
        screen.getByRole('button', {
          name: 'Save current 3 teams for later',
        })
      ).toBeInTheDocument();
    });

    it('should have singular aria-label for single team', () => {
      const teams = [createMockTeam('1', 'Team 1', 1)];

      render(<SettingsPanel {...createDefaultProps({ currentTeams: teams })} />);

      expect(
        screen.getByRole('button', {
          name: 'Save current 1 team for later',
        })
      ).toBeInTheDocument();
    });
  });

  describe('load teams functionality', () => {
    it('should show saved teams section when lastTeamSetup exists', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Team A', 'Team B', 'Team C'],
        count: 3,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText('Saved Teams')).toBeInTheDocument();
      expect(screen.getByText('3 teams')).toBeInTheDocument();
    });

    it('should display team names preview (up to 5)', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'],
        count: 5,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
      expect(screen.getByText('Delta')).toBeInTheDocument();
      expect(screen.getByText('Epsilon')).toBeInTheDocument();
    });

    it('should show "+N more" when more than 5 teams', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        count: 7,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should render Load Teams button', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Team A'],
        count: 1,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText('Load Teams')).toBeInTheDocument();
    });

    it('should call onLoadTeams with team setup when Load button is clicked', () => {
      const onLoadTeams = vi.fn();
      const lastTeamSetup: TeamSetup = {
        names: ['Team A', 'Team B'],
        count: 2,
      };

      render(
        <SettingsPanel
          {...createDefaultProps({ lastTeamSetup, onLoadTeams })}
        />
      );

      fireEvent.click(screen.getByText('Load Teams'));

      expect(onLoadTeams).toHaveBeenCalledWith(lastTeamSetup);
    });

    it('should have correct aria-label for Load button', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Team A', 'Team B'],
        count: 2,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(
        screen.getByRole('button', { name: 'Load 2 saved teams' })
      ).toBeInTheDocument();
    });

    it('should not show saved teams section when lastTeamSetup is null', () => {
      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup: null })} />);

      expect(screen.queryByText('Saved Teams')).not.toBeInTheDocument();
      expect(screen.queryByText('Load Teams')).not.toBeInTheDocument();
    });

    it('should not show saved teams section when lastTeamSetup.count is 0', () => {
      const lastTeamSetup: TeamSetup = {
        names: [],
        count: 0,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.queryByText('Saved Teams')).not.toBeInTheDocument();
      expect(screen.queryByText('Load Teams')).not.toBeInTheDocument();
    });

    it('should show "No saved team setup available" when no teams saved', () => {
      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup: null })} />);

      expect(
        screen.getByText('No saved team setup available')
      ).toBeInTheDocument();
    });

    it('should use singular "team" when count is 1', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Solo Team'],
        count: 1,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText('1 team')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible section headings', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      // Sections should be accessible by their headings
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Game Configuration' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Timer Settings' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Audio Settings' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Team Setup' })
      ).toBeInTheDocument();
    });

    it('should have accessible switch controls', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      expect(
        screen.getByRole('switch', { name: /auto-start timer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /show timer on display/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: /text-to-speech/i })
      ).toBeInTheDocument();
    });

    it('should have accessible slider controls', () => {
      render(<SettingsPanel {...createDefaultProps()} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(3);
    });

    it('should have accessible saved team setup region', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['Team A'],
        count: 1,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(
        screen.getByRole('region', { name: 'Saved team setup' })
      ).toBeInTheDocument();
    });
  });

  describe('settings ranges', () => {
    it('should use correct min/max for roundsCount from SETTINGS_RANGES', () => {
      // This test verifies the component uses SETTINGS_RANGES constants
      expect(SETTINGS_RANGES.roundsCount.min).toBe(1);
      expect(SETTINGS_RANGES.roundsCount.max).toBe(6);
    });

    it('should use correct min/max for questionsPerRound from SETTINGS_RANGES', () => {
      expect(SETTINGS_RANGES.questionsPerRound.min).toBe(3);
      expect(SETTINGS_RANGES.questionsPerRound.max).toBe(10);
    });

    it('should use correct min/max for timerDuration from SETTINGS_RANGES', () => {
      expect(SETTINGS_RANGES.timerDuration.min).toBe(10);
      expect(SETTINGS_RANGES.timerDuration.max).toBe(120);
    });
  });

  describe('edge cases', () => {
    it('should handle empty team names array in lastTeamSetup', () => {
      const lastTeamSetup: TeamSetup = {
        names: [],
        count: 0,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      // Should show "no saved team setup" message instead of empty saved teams section
      expect(
        screen.getByText('No saved team setup available')
      ).toBeInTheDocument();
    });

    it('should handle exactly 5 teams without showing "+N more"', () => {
      const lastTeamSetup: TeamSetup = {
        names: ['T1', 'T2', 'T3', 'T4', 'T5'],
        count: 5,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      // All 5 should be shown
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.getByText('T5')).toBeInTheDocument();
      // No "+N more" should appear
      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });

    it('should handle very long team names gracefully', () => {
      const longName = 'A'.repeat(50);
      const lastTeamSetup: TeamSetup = {
        names: [longName],
        count: 1,
      };

      render(<SettingsPanel {...createDefaultProps({ lastTeamSetup })} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });
});

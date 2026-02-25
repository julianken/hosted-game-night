import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock motion/react -- AnimatePresence + motion elements rendered as plain HTML
// ---------------------------------------------------------------------------
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <div {...(htmlProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    h2: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLHeadingElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <h2 {...(htmlProps as React.HTMLAttributes<HTMLHeadingElement>)}>{children}</h2>;
    },
    p: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLParagraphElement> & { variants?: unknown; initial?: string; animate?: string; exit?: string }) => {
      const { variants: _v, initial: _i, animate: _a, exit: _e, ...htmlProps } = rest as Record<string, unknown>;
      void _v; void _i; void _a; void _e;
      return <p {...(htmlProps as React.HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
    },
  },
  useReducedMotion: vi.fn(() => true), // Reduced motion = all phases instant
}));

// ---------------------------------------------------------------------------
// Mock motion presets
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/presets', () => ({
  podium1st: {},
  podium2nd: {},
  podium3rd: {},
  podium1stReduced: {},
  podium2ndReduced: {},
  podium3rdReduced: {},
  podiumRest: {},
  podiumRestReduced: {},
  winnerAnnouncement: {},
}));

// ---------------------------------------------------------------------------
// Mock team colors
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/team-colors', () => ({
  getTeamColor: (index: number) => ({
    bg: `#color-${index}`,
    fg: '#FFFFFF',
    subtle: `rgba(0,0,0,0.05)`,
    border: `rgba(0,0,0,0.3)`,
    glow: `rgba(0,0,0,0.2)`,
    cssVar: `--team-${index}`,
  }),
}));

// ---------------------------------------------------------------------------
// Mock game store
// ---------------------------------------------------------------------------
const makeTeam = (id: string, name: string, score: number) => ({ id, name, score });

const mockTeams = [
  makeTeam('t1', 'Alpha', 10),
  makeTeam('t2', 'Bravo', 20),
  makeTeam('t3', 'Charlie', 15),
];

// Sorted by score descending: Bravo(20), Charlie(15), Alpha(10)
const mockSortedTeams = [
  makeTeam('t2', 'Bravo', 20),
  makeTeam('t3', 'Charlie', 15),
  makeTeam('t1', 'Alpha', 10),
];

const mockStoreState: Record<string, unknown> = {
  teams: mockTeams,
};

let mockSortedTeamsValue = mockSortedTeams;

vi.mock('@/stores/game-store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
  useGameSelectors: () => ({
    teamsSortedByScore: mockSortedTeamsValue,
  }),
}));

// ---------------------------------------------------------------------------
// Helper: configure store state
// ---------------------------------------------------------------------------
function setState(overrides: {
  teams?: Array<{ id: string; name: string; score: number }>;
  sortedTeams?: Array<{ id: string; name: string; score: number }>;
} = {}): void {
  mockStoreState.teams = overrides.teams ?? mockTeams;
  mockSortedTeamsValue = overrides.sortedTeams ?? mockSortedTeams;
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { FinalPodiumScene } from '../FinalPodiumScene';

// ===========================================================================
// TESTS
// ===========================================================================

describe('FinalPodiumScene', () => {
  beforeEach(() => {
    setState();
  });

  it('renders the "FINAL STANDINGS" title', () => {
    render(<FinalPodiumScene />);

    expect(screen.getByText('FINAL STANDINGS')).toBeInTheDocument();
  });

  it('has an accessible region with aria-label "Final standings podium"', () => {
    render(<FinalPodiumScene />);

    const region = screen.getByRole('region', { name: 'Final standings podium' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the top 3 teams with correct rank labels and aria-labels', () => {
    render(<FinalPodiumScene />);

    // 1st place: Bravo (score 20)
    expect(screen.getByLabelText('1st place: Bravo with 20 points')).toBeInTheDocument();
    // 2nd place: Charlie (score 15)
    expect(screen.getByLabelText('2nd place: Charlie with 15 points')).toBeInTheDocument();
    // 3rd place: Alpha (score 10)
    expect(screen.getByLabelText('3rd place: Alpha with 10 points')).toBeInTheDocument();
  });

  it('renders rank labels (1st, 2nd, 3rd) in podium cards', () => {
    render(<FinalPodiumScene />);

    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('renders team names in podium cards', () => {
    render(<FinalPodiumScene />);

    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('renders remaining teams (4th+) in additional standings when more than 3 teams', () => {
    const teams = [
      makeTeam('t1', 'Alpha', 10),
      makeTeam('t2', 'Bravo', 20),
      makeTeam('t3', 'Charlie', 15),
      makeTeam('t4', 'Delta', 8),
      makeTeam('t5', 'Echo', 5),
    ];
    const sorted = [
      makeTeam('t2', 'Bravo', 20),
      makeTeam('t3', 'Charlie', 15),
      makeTeam('t1', 'Alpha', 10),
      makeTeam('t4', 'Delta', 8),
      makeTeam('t5', 'Echo', 5),
    ];
    setState({ teams, sortedTeams: sorted });
    render(<FinalPodiumScene />);

    // Additional standings section
    const additionalStandings = screen.getByRole('list', { name: 'Additional standings' });
    expect(additionalStandings).toBeInTheDocument();

    // 4th and 5th place teams shown with rank numbers
    expect(screen.getByText('4.')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.getByText('5.')).toBeInTheDocument();
    expect(screen.getByText('Echo')).toBeInTheDocument();
  });

  it('does not render additional standings section when there are exactly 3 teams', () => {
    render(<FinalPodiumScene />);

    expect(screen.queryByRole('list', { name: 'Additional standings' })).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock motion/react -- AnimatePresence + motion.div rendered as plain divs
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
  },
  useReducedMotion: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Mock motion presets
// ---------------------------------------------------------------------------
vi.mock('@/lib/motion/presets', () => ({
  heroSceneEnter: {},
  heroSceneEnterReduced: {},
}));

// ---------------------------------------------------------------------------
// Mock game store
// ---------------------------------------------------------------------------
const mockStoreState: Record<string, unknown> = {
  totalRounds: 3,
  teams: [],
};

vi.mock('@/stores/game-store', () => ({
  useGameStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
}));

// ---------------------------------------------------------------------------
// Helper: configure store state
// ---------------------------------------------------------------------------
function setState(overrides: Partial<typeof mockStoreState> = {}): void {
  mockStoreState.totalRounds = overrides.totalRounds ?? 3;
  mockStoreState.teams = overrides.teams ?? [];
}

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { GameIntroScene } from '../GameIntroScene';

// ===========================================================================
// TESTS
// ===========================================================================

describe('GameIntroScene', () => {
  beforeEach(() => {
    setState();
  });

  it('renders the "GET READY" hero text', () => {
    render(<GameIntroScene />);

    expect(screen.getByText('GET READY')).toBeInTheDocument();
  });

  it('has an accessible region with aria-label "Game introduction"', () => {
    render(<GameIntroScene />);

    const region = screen.getByRole('region', { name: 'Game introduction' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('displays the round count badge with singular form for 1 round', () => {
    setState({ totalRounds: 1 });
    render(<GameIntroScene />);

    expect(screen.getByText('1 Round')).toBeInTheDocument();
  });

  it('displays the round count badge with plural form for multiple rounds', () => {
    setState({ totalRounds: 4 });
    render(<GameIntroScene />);

    expect(screen.getByText('4 Rounds')).toBeInTheDocument();
  });

  it('displays the team count badge when teams are present', () => {
    setState({
      teams: [
        { id: 't1', name: 'Table 1', score: 0 },
        { id: 't2', name: 'Table 2', score: 0 },
        { id: 't3', name: 'Table 3', score: 0 },
      ],
    });
    render(<GameIntroScene />);

    expect(screen.getByText('3 Teams')).toBeInTheDocument();
  });

  it('does not display a team count badge when there are no teams', () => {
    setState({ teams: [] });
    render(<GameIntroScene />);

    expect(screen.queryByText(/Team/)).not.toBeInTheDocument();
  });
});

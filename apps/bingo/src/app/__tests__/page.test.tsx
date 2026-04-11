/**
 * Tests for Bingo home page (standalone mode)
 * Verifies page renders with Play Now CTA and content sections
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock components
vi.mock('@/components/stats', () => ({
  StatsDisplay: () => <div data-testid="stats-display">Stats</div>,
}));

import Home from '../page';

describe('Home Page (standalone)', () => {
  it('should render Play Now link pointing to /play', () => {
    render(<Home />);

    const playLink = screen.getByRole('link', { name: /play now/i });
    expect(playLink).toBeInTheDocument();
    expect(playLink).toHaveAttribute('href', '/play');
  });

  it('should NOT render a login button', () => {
    render(<Home />);

    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('should NOT render a Play as Guest link', () => {
    render(<Home />);

    expect(screen.queryByRole('link', { name: /play as guest/i })).not.toBeInTheDocument();
  });

  describe('content sections', () => {
    it('should render hero section with title and description', () => {
      render(<Home />);

      expect(screen.getByText('Bingo')).toBeInTheDocument();
      expect(screen.getByText(/modern bingo for groups and communities/i)).toBeInTheDocument();
    });

    it('should render features section', () => {
      render(<Home />);

      expect(screen.getByText('Designed for Everyone')).toBeInTheDocument();
      expect(screen.getByText('75-Ball Bingo')).toBeInTheDocument();
      expect(screen.getByText('Large Text')).toBeInTheDocument();
      expect(screen.getByText('Dual Screen')).toBeInTheDocument();
      expect(screen.getByText('Auto-Call')).toBeInTheDocument();
      expect(screen.getByText('29 Patterns')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should render how it works section', () => {
      render(<Home />);

      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByText('Open the Presenter View')).toBeInTheDocument();
      expect(screen.getByText('Open the Audience Display')).toBeInTheDocument();
      expect(screen.getByText('Select a Pattern & Start')).toBeInTheDocument();
    });

    it('should render stats display', () => {
      render(<Home />);

      expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    });

    it('should render footer', () => {
      render(<Home />);

      expect(
        screen.getByText(/modern bingo system for groups and communities/i),
      ).toBeInTheDocument();
    });
  });
});

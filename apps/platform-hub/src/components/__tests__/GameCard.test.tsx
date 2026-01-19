import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { GameCard } from '../GameCard';

const defaultProps = {
  title: 'Test Game',
  description: 'A fun test game',
  href: 'http://localhost:3000/play',
  icon: <span data-testid="test-icon">Icon</span>,
};

describe('GameCard', () => {
  describe('rendering', () => {
    it('renders the title', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Test Game' })).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByText('A fun test game')).toBeInTheDocument();
    });

    it('renders the icon', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders as an anchor element', () => {
      render(<GameCard {...defaultProps} />);
      const link = screen.getByRole('article');
      expect(link.tagName).toBe('A');
    });

    it('has correct href for available games', () => {
      render(<GameCard {...defaultProps} status="available" />);
      const link = screen.getByRole('article');
      expect(link).toHaveAttribute('href', 'http://localhost:3000/play');
    });
  });

  describe('status states', () => {
    it('shows "Ready to Play" badge for available games', () => {
      render(<GameCard {...defaultProps} status="available" />);
      expect(screen.getByRole('status')).toHaveTextContent('Ready to Play');
    });

    it('shows "Coming Soon" badge for coming_soon games', () => {
      render(<GameCard {...defaultProps} status="coming_soon" />);
      expect(screen.getByRole('status')).toHaveTextContent('Coming Soon');
    });

    it('shows "Maintenance" badge for maintenance games', () => {
      render(<GameCard {...defaultProps} status="maintenance" />);
      expect(screen.getByRole('status')).toHaveTextContent('Maintenance');
    });

    it('defaults to available status', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByRole('status')).toHaveTextContent('Ready to Play');
    });
  });

  describe('interactivity', () => {
    it('is clickable when available', () => {
      render(<GameCard {...defaultProps} status="available" />);
      const link = screen.getByRole('article');
      expect(link).toHaveAttribute('href');
      expect(link).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('is not clickable when coming_soon', () => {
      render(<GameCard {...defaultProps} status="coming_soon" />);
      const link = screen.getByRole('article');
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('is not clickable when maintenance', () => {
      render(<GameCard {...defaultProps} status="maintenance" />);
      const link = screen.getByRole('article');
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('has tabIndex 0 when available', () => {
      render(<GameCard {...defaultProps} status="available" />);
      const link = screen.getByRole('article');
      expect(link).toHaveAttribute('tabIndex', '0');
    });

    it('has tabIndex -1 when not available', () => {
      render(<GameCard {...defaultProps} status="coming_soon" />);
      const link = screen.getByRole('article');
      expect(link).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('CTA button', () => {
    it('shows "Play Now" text when available', () => {
      render(<GameCard {...defaultProps} status="available" />);
      expect(screen.getByText('Play Now')).toBeInTheDocument();
    });

    it('shows status text instead of "Play Now" when not available', () => {
      render(<GameCard {...defaultProps} status="coming_soon" />);
      // There should be two "Coming Soon" texts - badge and CTA button
      const comingSoonElements = screen.getAllByText('Coming Soon');
      expect(comingSoonElements.length).toBe(2);
    });
  });

  describe('accessibility', () => {
    it('has descriptive aria-label', () => {
      render(<GameCard {...defaultProps} status="available" />);
      const link = screen.getByRole('article');
      expect(link).toHaveAttribute(
        'aria-label',
        'Test Game - Ready to Play. A fun test game'
      );
    });

    it('has role="article"', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('icon container has aria-hidden', () => {
      const { container } = render(<GameCard {...defaultProps} />);
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('status badge has role="status"', () => {
      render(<GameCard {...defaultProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom colorClass', () => {
      render(<GameCard {...defaultProps} colorClass="bg-blue-50" />);
      const link = screen.getByRole('article');
      expect(link.className).toContain('bg-blue-50');
    });

    it('applies custom className', () => {
      render(<GameCard {...defaultProps} className="custom-class" />);
      const link = screen.getByRole('article');
      expect(link).toHaveClass('custom-class');
    });

    it('has rounded corners', () => {
      render(<GameCard {...defaultProps} />);
      const link = screen.getByRole('article');
      expect(link.className).toContain('rounded-2xl');
    });

    it('has border', () => {
      render(<GameCard {...defaultProps} />);
      const link = screen.getByRole('article');
      expect(link.className).toContain('border-2');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = createRef<HTMLAnchorElement>();
      render(<GameCard {...defaultProps} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
    });
  });

  describe('additional props', () => {
    it('passes through data attributes', () => {
      render(<GameCard {...defaultProps} data-testid="game-card" />);
      expect(screen.getByTestId('game-card')).toBeInTheDocument();
    });
  });
});

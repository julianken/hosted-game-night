import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage', () => {
  describe('hero section', () => {
    it('renders the main heading', () => {
      render(<HomePage />);
      expect(
        screen.getByRole('heading', { name: 'Beak Gaming Platform', level: 1 })
      ).toBeInTheDocument();
    });

    it('renders the tagline', () => {
      render(<HomePage />);
      expect(
        screen.getByText(/Fun, accessible games designed for retirement communities/)
      ).toBeInTheDocument();
    });

    it('renders the call-to-action message', () => {
      render(<HomePage />);
      expect(screen.getByText(/Easy to run. Fun to play./)).toBeInTheDocument();
    });

    it('has proper aria-labelledby on hero section', () => {
      const { container } = render(<HomePage />);
      const heroSection = container.querySelector('section[aria-labelledby="hero-heading"]');
      expect(heroSection).toBeInTheDocument();
    });
  });

  describe('game selector section', () => {
    it('renders the section heading', () => {
      render(<HomePage />);
      expect(
        screen.getByRole('heading', { name: 'Choose Your Game', level: 2 })
      ).toBeInTheDocument();
    });

    it('renders the game list', () => {
      render(<HomePage />);
      expect(screen.getByRole('list', { name: 'Available games' })).toBeInTheDocument();
    });

    it('renders Beak Bingo card', () => {
      render(<HomePage />);
      expect(screen.getByText('Beak Bingo')).toBeInTheDocument();
    });

    it('renders Bingo description', () => {
      render(<HomePage />);
      expect(
        screen.getByText(/Classic 75-ball bingo with dual-screen display/)
      ).toBeInTheDocument();
    });

    it('renders Trivia Night card', () => {
      render(<HomePage />);
      expect(screen.getByText('Trivia Night')).toBeInTheDocument();
    });

    it('renders Trivia description', () => {
      render(<HomePage />);
      expect(
        screen.getByText(/Team-based trivia with presenter controls/)
      ).toBeInTheDocument();
    });

    it('renders two game cards', () => {
      render(<HomePage />);
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });
  });

  describe('features section', () => {
    it('renders the section heading', () => {
      render(<HomePage />);
      expect(
        screen.getByRole('heading', { name: 'Designed for You', level: 2 })
      ).toBeInTheDocument();
    });

    it('renders Easy to Read feature', () => {
      render(<HomePage />);
      expect(screen.getByText('Easy to Read')).toBeInTheDocument();
      expect(
        screen.getByText(/Large fonts and high contrast/)
      ).toBeInTheDocument();
    });

    it('renders Dual Screen feature', () => {
      render(<HomePage />);
      expect(screen.getByText('Dual Screen')).toBeInTheDocument();
      expect(
        screen.getByText(/Separate display for projectors/)
      ).toBeInTheDocument();
    });

    it('renders Tablet Friendly feature', () => {
      render(<HomePage />);
      expect(screen.getByText('Tablet Friendly')).toBeInTheDocument();
      expect(
        screen.getByText(/Works great on tablets and touch screens/)
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('uses semantic HTML structure', () => {
      render(<HomePage />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<HomePage />);
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(2);
      expect(h3s.length).toBeGreaterThanOrEqual(3);
    });

    it('game cards are articles', () => {
      render(<HomePage />);
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(2);
    });

    it('sections have aria-labelledby', () => {
      const { container } = render(<HomePage />);
      const labelledSections = container.querySelectorAll('section[aria-labelledby]');
      expect(labelledSections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('responsive layout', () => {
    it('has grid layout for game cards', () => {
      const { container } = render(<HomePage />);
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('has responsive grid columns', () => {
      const { container } = render(<HomePage />);
      const grid = container.querySelector('[role="list"]');
      expect(grid?.className).toContain('md:grid-cols-2');
    });
  });
});

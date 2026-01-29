/**
 * Tests for Bingo home page (BEA-422)
 * Verifies auth-conditional UI rendering
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js cookies - must be hoisted to top
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock components
vi.mock('@/components/stats', () => ({
  StatsDisplay: () => <div data-testid="stats-display">Stats</div>,
}));

vi.mock('@/components/auth/LoginButton', () => ({
  LoginButton: () => (
    <button data-testid="login-button">Sign in with Beak Gaming</button>
  ),
}));

import Home from '../page';
import { cookies } from 'next/headers';

describe('Home Page (BEA-422)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is signed in', () => {
    it('should render only the Play button', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'mock-access-token' }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      // Should show Play button
      const playButton = screen.getByRole('link', { name: /play/i });
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveAttribute('href', '/play');

      // Should NOT show login button
      expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
    });

    it('should NOT show Presenter Mode button', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'mock-access-token' }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      // No "Presenter Mode" text anywhere
      expect(screen.queryByText(/presenter mode/i)).not.toBeInTheDocument();
    });
  });

  describe('when user is NOT signed in', () => {
    it('should render only the login button', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      // Should show login button
      expect(screen.getByTestId('login-button')).toBeInTheDocument();

      // Should NOT show Play button
      expect(screen.queryByRole('link', { name: /play/i })).not.toBeInTheDocument();
    });

    it('should NOT show Presenter Mode button', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      // No "Presenter Mode" text anywhere
      expect(screen.queryByText(/presenter mode/i)).not.toBeInTheDocument();
    });
  });

  describe('content sections', () => {
    it('should render hero section with title and description', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      expect(screen.getByText('Beak Bingo')).toBeInTheDocument();
      expect(screen.getByText(/modern bingo for retirement communities/i)).toBeInTheDocument();
    });

    it('should render features section', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      expect(screen.getByText('Designed for Seniors')).toBeInTheDocument();
      expect(screen.getByText('75-Ball Bingo')).toBeInTheDocument();
      expect(screen.getByText('Large Text')).toBeInTheDocument();
      expect(screen.getByText('Dual Screen')).toBeInTheDocument();
      expect(screen.getByText('Auto-Call')).toBeInTheDocument();
      expect(screen.getByText('29 Patterns')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should render how it works section', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByText('Open the Presenter View')).toBeInTheDocument();
      expect(screen.getByText('Open the Audience Display')).toBeInTheDocument();
      expect(screen.getByText('Select a Pattern & Start')).toBeInTheDocument();
    });

    it('should render stats display', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    });

    it('should render footer', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const element = await Home();
      render(element);

      expect(screen.getByText(/beak gaming platform/i)).toBeInTheDocument();
    });
  });
});

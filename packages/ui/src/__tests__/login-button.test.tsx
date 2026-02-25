import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginButton } from '../login-button';

// Mock the auth module
vi.mock('@joolie-boolie/auth', () => ({
  startOAuthFlow: vi.fn(),
}));

// Import after mock so we get the mocked version
import { startOAuthFlow } from '@joolie-boolie/auth';

const mockStartOAuthFlow = vi.mocked(startOAuthFlow);

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartOAuthFlow.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render "Sign in with Joolie Boolie" text', () => {
      render(<LoginButton />);
      expect(screen.getByRole('button', { name: 'Sign in with Joolie Boolie' })).toBeInTheDocument();
    });

    it('should show "Redirecting..." when loading', async () => {
      // Make the OAuth flow hang so we can observe loading state
      mockStartOAuthFlow.mockReturnValue(new Promise(() => {}));

      render(<LoginButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
      });
    });

    it('should disable button when loading', async () => {
      mockStartOAuthFlow.mockReturnValue(new Promise(() => {}));

      render(<LoginButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });
  });

  describe('click handler', () => {
    it('should call startOAuthFlow when clicked', async () => {
      render(<LoginButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockStartOAuthFlow).toHaveBeenCalledTimes(1);
        expect(mockStartOAuthFlow).toHaveBeenCalledWith(undefined);
      });
    });

    it('should pass returnTo to startOAuthFlow', async () => {
      render(<LoginButton returnTo="/play" />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockStartOAuthFlow).toHaveBeenCalledWith('/play');
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully and re-enable button', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockStartOAuthFlow.mockRejectedValue(new Error('Network error'));

      render(<LoginButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('OAuth login failed:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to start login. Please check your connection and try again.'
        );
        expect(screen.getByRole('button')).not.toBeDisabled();
      });

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

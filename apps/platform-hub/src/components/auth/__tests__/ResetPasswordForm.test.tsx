import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from '../ResetPasswordForm';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
const originalFetch = global.fetch;

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Password Validation', () => {
    it('should require password to be at least 8 characters', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'Short1');
      await user.type(confirmInput, 'Short1');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should require password to include uppercase letter', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'lowercase123');
      await user.type(confirmInput, 'lowercase123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must include at least one uppercase letter/i)
        ).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should require password to include lowercase letter', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'UPPERCASE123');
      await user.type(confirmInput, 'UPPERCASE123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must include at least one lowercase letter/i)
        ).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should require password to include a number', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'NoNumbers');
      await user.type(confirmInput, 'NoNumbers');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must include at least one number/i)
        ).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept valid password that meets all requirements', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'ValidPass123');
      await user.type(confirmInput, 'ValidPass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: 'ValidPass123' }),
        });
      });
    });
  });

  describe('Password Matching', () => {
    it('should require passwords to match', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'ValidPass123');
      await user.type(confirmInput, 'DifferentPass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should require confirmation password to be entered', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'ValidPass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call API endpoint with valid input', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'NewSecurePass123');
      await user.type(confirmInput, 'NewSecurePass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: 'NewSecurePass123' }),
        });
      });
    });

    it('should show success message when password is updated', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'NewSecurePass123');
      await user.type(confirmInput, 'NewSecurePass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset complete/i)).toBeInTheDocument();
        expect(
          screen.getByText(/your password has been successfully updated/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error message when API call fails', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'This endpoint only accepts recovery sessions' }),
      });
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText('New Password');
      const confirmInput = screen.getByLabelText('Confirm New Password');
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(passwordInput, 'NewSecurePass123');
      await user.type(confirmInput, 'NewSecurePass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/this endpoint only accepts recovery sessions/i)
        ).toBeInTheDocument();
      });
    });
  });
});

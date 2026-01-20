import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGameModal } from '../create-game-modal';

describe('CreateGameModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Game')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <CreateGameModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display introduction text', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByText(/Set a PIN to protect presenter controls/)
      ).toBeInTheDocument();
    });

    it('should display helpful tip', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByText(/Choose a PIN you'll remember for rejoining later/)
      ).toBeInTheDocument();
    });

    it('should render PIN input field', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toBeInTheDocument();
    });

    it('should render confirm PIN input field', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Confirm your PIN/i)).toBeInTheDocument();
    });

    it('should render Cancel and Create Game buttons', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create game session/i })).toBeInTheDocument();
    });
  });

  describe('PIN validation', () => {
    it('should accept valid 4-digit PIN', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.click(screen.getByRole('button', { name: /Create game session/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('1234');
      });
    });

    it('should accept valid 6-digit PIN', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '123456');
      await user.type(confirmInput, '123456');
      await user.click(screen.getByRole('button', { name: /Create game session/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('123456');
      });
    });

    it('should show error for empty PIN', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Click into the PIN input and then tab out to trigger blur validation
      const pinInput = screen.getByLabelText(/Enter your PIN/i);

      // Wrap user interactions in act() to ensure state updates complete
      await act(async () => {
        await user.click(pinInput);
        await user.tab();
      });

      // Wait for validation error with default timeout
      await waitFor(() => {
        expect(screen.getByText(/PIN is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for PIN less than 4 digits', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      await user.type(pinInput, '123');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/PIN must be at least 4 digits/i)).toBeInTheDocument();
      });
    });

    it('should enforce max length of 6 digits on input', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i) as HTMLInputElement;

      // Try to type 7 digits - maxLength should prevent the 7th
      await user.type(pinInput, '1234567');

      // Input should only contain 6 digits due to maxLength
      expect(pinInput).toHaveValue('123456');
      expect(pinInput.value.length).toBe(6);
    });

    it('should show error for non-numeric PIN', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      await user.type(pinInput, 'abcd');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/PIN must contain only digits/i)).toBeInTheDocument();
      });
    });

    it('should clear PIN error when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);

      // Trigger error
      await user.type(pinInput, '12');
      await user.tab();
      await waitFor(() => {
        expect(screen.getByText(/PIN must be at least 4 digits/i)).toBeInTheDocument();
      });

      // Start typing again
      await user.type(pinInput, '34');
      await waitFor(() => {
        expect(screen.queryByText(/PIN must be at least 4 digits/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('PIN confirmation validation', () => {
    it('should show error when confirm PIN is empty', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.click(confirmInput);
      await user.tab(); // Trigger blur on confirm

      await waitFor(() => {
        expect(screen.getByText(/Please confirm your PIN/i)).toBeInTheDocument();
      });
    });

    it('should show error when PINs do not match', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '5678');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/PINs do not match/i)).toBeInTheDocument();
      });
    });

    it('should not submit when PINs do not match', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '5678');
      await user.click(screen.getByRole('button', { name: /Create game session/i }));

      await waitFor(() => {
        expect(screen.getByText(/PINs do not match/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should clear confirm error when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      // Trigger error
      await user.type(pinInput, '1234');
      await user.type(confirmInput, '56');
      await user.tab();
      await waitFor(() => {
        expect(screen.getByText(/PINs do not match/i)).toBeInTheDocument();
      });

      // Start typing again
      await user.type(confirmInput, '78');
      await waitFor(() => {
        expect(screen.queryByText(/PINs do not match/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with validated PIN', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.click(screen.getByRole('button', { name: /Create game session/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith('1234');
      });
    });

    it('should not call onClose after successful submission', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.click(screen.getByRole('button', { name: /Create game session/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Modal doesn't auto-close - parent component handles that
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable inputs during loading', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toBeDisabled();
      expect(screen.getByLabelText(/Confirm your PIN/i)).toBeDisabled();
    });

    it('should disable buttons during loading', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Creating game session/i })).toBeDisabled();
    });

    it('should show loading text on submit button', async () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      // Wait for component to render with loading state
      await waitFor(() => {
        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
      });
    });

    it('should not show loading text when not loading', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={false}
        />
      );

      // Button component shows "Loading..." when loading, not "Creating..."
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
      expect(screen.getByText(/Create Game/i)).toBeInTheDocument();
    });
  });

  describe('server error display', () => {
    it('should display server error message', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          error="Failed to create game session"
        />
      );

      expect(screen.getByText('Failed to create game session')).toBeInTheDocument();
    });

    it('should show error with alert role', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          error="Network error"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Network error');
    });

    it('should not display error when error prop is undefined', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('form reset', () => {
    it('should reset form when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill in form
      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);
      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');

      // Close modal
      rerender(
        <CreateGameModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen modal
      rerender(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Form should be reset
      const newPinInput = screen.getByLabelText(/Enter your PIN/i);
      const newConfirmInput = screen.getByLabelText(/Confirm your PIN/i);
      expect(newPinInput).toHaveValue('');
      expect(newConfirmInput).toHaveValue('');
    });

    it('should clear validation errors when modal closes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Trigger validation error
      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      await user.type(pinInput, '12');
      await user.tab();
      await waitFor(() => {
        expect(screen.getByText(/PIN must be at least 4 digits/i)).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <CreateGameModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen modal
      rerender(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Error should be cleared
      expect(screen.queryByText(/PIN must be at least 4 digits/i)).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should submit form when Enter is pressed in confirm field', async () => {
      const user = userEvent.setup();
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const pinInput = screen.getByLabelText(/Enter your PIN/i);
      const confirmInput = screen.getByLabelText(/Confirm your PIN/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('1234');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on inputs', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('aria-label', 'Enter your PIN');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('aria-label', 'Confirm your PIN');
    });

    it('should have proper ARIA labels on buttons', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel and close modal/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /Create game session/i })).toHaveAttribute('aria-label');
    });

    it('should have role="note" for helpful tip', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const tip = screen.getByRole('note');
      expect(tip).toBeInTheDocument();
      expect(tip).toHaveTextContent(/Choose a PIN you'll remember/i);
    });

    it('should have aria-live="polite" on server error', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          error="Server error"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should mark inputs as required', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toBeRequired();
      expect(screen.getByLabelText(/Confirm your PIN/i)).toBeRequired();
    });

    it('should have password type for security', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('type', 'password');
    });

    it('should have numeric input mode for mobile keyboards', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('inputMode', 'numeric');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('inputMode', 'numeric');
    });
  });

  describe('input constraints', () => {
    it('should have maxLength of 6 on PIN inputs', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('maxLength', '6');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('maxLength', '6');
    });

    it('should have pattern attribute for digits only', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('pattern', '\\d*');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('pattern', '\\d*');
    });

    it('should have autocomplete="new-password" for password managers', () => {
      render(
        <CreateGameModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Enter your PIN/i)).toHaveAttribute('autoComplete', 'new-password');
      expect(screen.getByLabelText(/Confirm your PIN/i)).toHaveAttribute('autoComplete', 'new-password');
    });
  });
});

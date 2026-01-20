import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGameModal } from '../create-game-modal';

describe('CreateGameModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when open', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(screen.getByText('Create New Game')).toBeInTheDocument();
      expect(screen.getByLabelText(/enter your pin/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm your pin/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CreateGameModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create New Game')).not.toBeInTheDocument();
    });

    it('displays help text about PIN usage', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(
        screen.getByText(/choose a pin you'll remember for rejoining later/i)
      ).toBeInTheDocument();
    });

    it('displays intro text about audience not needing PIN', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(
        screen.getByText(/the audience won't need this/i)
      ).toBeInTheDocument();
    });
  });

  describe('PIN Validation', () => {
    it('shows error for PIN less than 4 digits', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      await user.type(pinInput, '123');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.getByText(/pin must be at least 4 digits/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for PIN more than 6 digits', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      // maxLength prevents typing more than 6, but we can programmatically set it
      // and trigger validation
      await user.type(pinInput, '123456');
      // Set value directly to bypass maxLength for testing
      pinInput.setAttribute('value', '1234567');
      Object.defineProperty(pinInput, 'value', {
        value: '1234567',
        writable: true,
        configurable: true,
      });
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.getByText(/pin must be no more than 6 digits/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for non-numeric PIN', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      await user.type(pinInput, 'abcd');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.getByText(/pin must contain only digits/i)
        ).toBeInTheDocument();
      });
    });

    it('accepts valid 4-digit PIN', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      await user.type(pinInput, '1234');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.queryByText(/pin must be at least 4 digits/i)
        ).not.toBeInTheDocument();
      });
    });

    it('accepts valid 6-digit PIN', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      await user.type(pinInput, '123456');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.queryByText(/pin must be no more than 6 digits/i)
        ).not.toBeInTheDocument();
      });
    });

    it('clears error when user starts typing again', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);

      // Trigger error
      await user.type(pinInput, '12');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/pin must be at least 4 digits/i)
        ).toBeInTheDocument();
      });

      // Clear error by typing
      await user.click(pinInput);
      await user.type(pinInput, '34');

      await waitFor(() => {
        expect(
          screen.queryByText(/pin must be at least 4 digits/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Validation', () => {
    it('shows error when confirmation does not match', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '5678');
      await user.tab(); // Trigger blur on confirm

      await waitFor(() => {
        expect(screen.getByText(/pins do not match/i)).toBeInTheDocument();
      });
    });

    it('does not show error when PINs match', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.tab(); // Trigger blur on confirm

      await waitFor(() => {
        expect(screen.queryByText(/pins do not match/i)).not.toBeInTheDocument();
      });
    });

    it('shows error when confirmation is empty', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.click(confirmInput);
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.getByText(/please confirm your pin/i)
        ).toBeInTheDocument();
      });
    });

    it('clears confirmation error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '5678');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/pins do not match/i)).toBeInTheDocument();
      });

      await user.click(confirmInput);
      await user.clear(confirmInput);
      await user.type(confirmInput, '1234');

      await waitFor(() => {
        expect(screen.queryByText(/pins do not match/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid PIN when form is submitted', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      render(<CreateGameModal {...defaultProps} onSubmit={onSubmit} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);
      const submitButton = screen.getByRole('button', { name: /create game/i });

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('1234');
      });
    });

    it('does not call onSubmit with invalid PIN', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<CreateGameModal {...defaultProps} onSubmit={onSubmit} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);
      const submitButton = screen.getByRole('button', { name: /create game/i });

      await user.type(pinInput, '12'); // Too short
      await user.type(confirmInput, '12');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
        expect(
          screen.getByText(/pin must be at least 4 digits/i)
        ).toBeInTheDocument();
      });
    });

    it('does not call onSubmit when PINs do not match', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<CreateGameModal {...defaultProps} onSubmit={onSubmit} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);
      const submitButton = screen.getByRole('button', { name: /create game/i });

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '5678');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByText(/pins do not match/i)).toBeInTheDocument();
      });
    });

    it('can be submitted by pressing Enter', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      render(<CreateGameModal {...defaultProps} onSubmit={onSubmit} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('1234');
      });
    });
  });

  describe('Loading State', () => {
    it('disables inputs and buttons when loading', () => {
      render(<CreateGameModal {...defaultProps} isLoading={true} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const submitButton = screen.getByRole('button', {
        name: /creating game session/i,
      });

      expect(pinInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('shows loading text on submit button when loading', () => {
      render(<CreateGameModal {...defaultProps} isLoading={true} />);

      // The button uses the Button component which shows "Loading..." with a spinner
      expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
    });

    it('shows normal text on submit button when not loading', () => {
      render(<CreateGameModal {...defaultProps} isLoading={false} />);

      expect(screen.getByText(/create game/i)).toBeInTheDocument();
      expect(screen.queryByText(/creating\.\.\./i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays server error when provided', () => {
      const serverError = 'Failed to create session. Please try again.';
      render(<CreateGameModal {...defaultProps} error={serverError} />);

      expect(screen.getByRole('alert')).toHaveTextContent(serverError);
    });

    it('does not display error alert when no error', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<CreateGameModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button (X) is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<CreateGameModal {...defaultProps} onClose={onClose} />);

      // Get the close button by its exact aria-label (not the cancel button)
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('resets form when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      await user.type(pinInput, '1234');
      await user.type(confirmInput, '1234');

      // Close modal
      rerender(<CreateGameModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<CreateGameModal {...defaultProps} isOpen={true} />);

      const newPinInput = screen.getByLabelText(/enter your pin/i);
      const newConfirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(newPinInput).toHaveValue('');
      expect(newConfirmInput).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on inputs', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(screen.getByLabelText(/enter your pin/i)).toHaveAttribute(
        'aria-label',
        'Enter your PIN'
      );
      expect(screen.getByLabelText(/confirm your pin/i)).toHaveAttribute(
        'aria-label',
        'Confirm your PIN'
      );
    });

    it('has proper ARIA labels on buttons', () => {
      render(<CreateGameModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute(
        'aria-label',
        'Cancel and close modal'
      );
      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toHaveAttribute('aria-label', 'Create game session');
    });

    it('marks modal as modal with aria-modal', () => {
      render(<CreateGameModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('associates error messages with inputs via aria-describedby', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);

      await user.type(pinInput, '12');
      await user.tab();

      await waitFor(() => {
        const errorId = pinInput.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        expect(document.getElementById(errorId!)).toHaveTextContent(
          /pin must be at least 4 digits/i
        );
      });
    });

    it('sets aria-invalid when input has error', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);

      await user.type(pinInput, '12');
      await user.tab();

      await waitFor(() => {
        expect(pinInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('uses role="alert" for error messages', async () => {
      const user = userEvent.setup();
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);

      await user.type(pinInput, '12');
      await user.tab();

      await waitFor(() => {
        const errorElement = screen.getByText(/pin must be at least 4 digits/i);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('uses role="note" for helpful tip', () => {
      render(<CreateGameModal {...defaultProps} />);

      const tipElement = screen.getByText(
        /choose a pin you'll remember for rejoining later/i
      ).closest('div');
      expect(tipElement).toHaveAttribute('role', 'note');
    });
  });

  describe('Input Attributes', () => {
    it('sets inputMode="numeric" for numeric inputs', () => {
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(pinInput).toHaveAttribute('inputMode', 'numeric');
      expect(confirmInput).toHaveAttribute('inputMode', 'numeric');
    });

    it('sets maxLength to 6 on PIN inputs', () => {
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(pinInput).toHaveAttribute('maxLength', '6');
      expect(confirmInput).toHaveAttribute('maxLength', '6');
    });

    it('sets type="password" on PIN inputs', () => {
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(pinInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('type', 'password');
    });

    it('sets autocomplete="new-password" to prevent autofill', () => {
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(pinInput).toHaveAttribute('autoComplete', 'new-password');
      expect(confirmInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('marks inputs as required', () => {
      render(<CreateGameModal {...defaultProps} />);

      const pinInput = screen.getByLabelText(/enter your pin/i);
      const confirmInput = screen.getByLabelText(/confirm your pin/i);

      expect(pinInput).toBeRequired();
      expect(confirmInput).toBeRequired();
    });
  });
});

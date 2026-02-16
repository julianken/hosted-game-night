import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Header } from '../Header';
import type { AuthUser } from '@joolie-boolie/auth';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
const mockUseRouter = vi.fn(() => ({
  push: mockPush,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
}));

// Mock @joolie-boolie/auth hooks
const mockSignOut = vi.fn();
const mockUseAuth = vi.fn<() => { user: AuthUser | null; signOut: typeof mockSignOut; isLoading: boolean }>();

mockUseAuth.mockReturnValue({
  user: null,
  signOut: mockSignOut,
  isLoading: false,
});

vi.mock('@joolie-boolie/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock @joolie-boolie/ui Button component
vi.mock('@joolie-boolie/ui', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    ...props
  }: React.PropsWithChildren<{
    onClick?: () => void;
    variant?: string;
    size?: string;
    [key: string]: unknown;
  }>) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Reset mocks to default state
    mockUseAuth.mockReturnValue({
      user: null,
      signOut: mockSignOut,
      isLoading: false,
    });
  });

  describe('rendering', () => {
    it('renders the header element', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders the brand name', () => {
      render(<Header />);
      expect(screen.getByText('Joolie Boolie')).toBeInTheDocument();
    });

    it('renders the tagline on larger screens', () => {
      render(<Header />);
      expect(screen.getByText('Fun for Everyone')).toBeInTheDocument();
    });

    it('renders the home link', () => {
      render(<Header />);
      const homeLink = screen.getByLabelText('Joolie Boolie - Home');
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('navigation', () => {
    it('has main navigation', () => {
      render(<Header />);
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });

    it('renders Games link', () => {
      render(<Header />);
      const gamesLink = screen.getByRole('link', { name: 'Games' });
      expect(gamesLink).toBeInTheDocument();
      expect(gamesLink).toHaveAttribute('href', '/');
    });
  });

  describe('accessibility', () => {
    it('has role="banner"', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('home link has aria-label', () => {
      render(<Header />);
      expect(screen.getByLabelText('Joolie Boolie - Home')).toBeInTheDocument();
    });

    it('logo SVG has aria-hidden', () => {
      const { container } = render(<Header />);
      const logoSvg = container.querySelector('svg[aria-hidden="true"]');
      expect(logoSvg).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has border-bottom', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header.className).toContain('border-b');
    });

    it('applies custom className', () => {
      render(<Header className="custom-header" />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = createRef<HTMLElement>();
      render(<Header ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('HEADER');
    });
  });

  describe('additional props', () => {
    it('passes through data attributes', () => {
      render(<Header data-testid="main-header" />);
      expect(screen.getByTestId('main-header')).toBeInTheDocument();
    });
  });

  describe('authentication-conditional UI', () => {
    describe('unauthenticated state', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: null,
          signOut: mockSignOut,
          isLoading: false,
        });
      });

      it('shows Sign In button when user is not authenticated', () => {
        render(<Header />);
        const signInButton = screen.getByTestId('sign-in-button');
        expect(signInButton).toBeInTheDocument();
        expect(signInButton).toHaveTextContent('Sign In');
      });

      it('does not show greeting when user is not authenticated', () => {
        render(<Header />);
        expect(screen.queryByTestId('facility-greeting')).not.toBeInTheDocument();
      });

      it('does not show Dashboard link when user is not authenticated', () => {
        render(<Header />);
        expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
      });

      it('does not show Settings link when user is not authenticated', () => {
        render(<Header />);
        expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
      });

      it('does not show Sign Out button when user is not authenticated', () => {
        render(<Header />);
        expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
      });

      it('Sign In button navigates to /login when clicked', () => {
        render(<Header />);
        const signInButton = screen.getByTestId('sign-in-button');
        signInButton.click();
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    describe('authenticated state', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { id: 'user-123', email: 'test@example.com' } as AuthUser | null,
          signOut: mockSignOut,
          isLoading: false,
        });
      });

      it('shows Dashboard link when user is authenticated', () => {
        render(<Header />);
        const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      });

      it('shows Settings link when user is authenticated', () => {
        render(<Header />);
        const settingsLink = screen.getByRole('link', { name: 'Settings' });
        expect(settingsLink).toBeInTheDocument();
        expect(settingsLink).toHaveAttribute('href', '/settings');
      });

      it('shows Sign Out button when user is authenticated', () => {
        render(<Header />);
        const logoutButton = screen.getByTestId('logout-button');
        expect(logoutButton).toBeInTheDocument();
        expect(logoutButton).toHaveTextContent('Sign Out');
      });

      it('shows "Welcome" greeting when user has no facility name', () => {
        render(<Header />);
        const greeting = screen.getByTestId('facility-greeting');
        expect(greeting).toHaveTextContent('Welcome');
        expect(greeting).not.toHaveTextContent('Welcome,');
      });

      it('shows "Welcome, [Facility Name]" when user has facility name', () => {
        mockUseAuth.mockReturnValue({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { facility_name: 'Sunny Acres' },
          } as unknown as AuthUser,
          signOut: mockSignOut,
          isLoading: false,
        });
        render(<Header />);
        const greeting = screen.getByTestId('facility-greeting');
        expect(greeting).toHaveTextContent('Welcome, Sunny Acres');
      });

      it('does not show Sign In button when user is authenticated', () => {
        render(<Header />);
        expect(screen.queryByTestId('sign-in-button')).not.toBeInTheDocument();
      });

      it('Sign Out button has correct accessibility label', () => {
        render(<Header />);
        const logoutButton = screen.getByLabelText('Sign out of your account');
        expect(logoutButton).toBeInTheDocument();
      });
    });

    describe('loading state', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: null,
          signOut: mockSignOut,
          isLoading: true,
        });
      });

      it('hides auth-dependent UI when loading', () => {
        render(<Header />);
        expect(screen.queryByTestId('sign-in-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
      });
    });

    describe('Sign Out handler', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { id: 'user-123', email: 'test@example.com' } as AuthUser | null,
          signOut: mockSignOut,
          isLoading: false,
        });
      });

      it('calls logout API and signOut when Sign Out is clicked', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        global.fetch = mockFetch;

        render(<Header />);
        const logoutButton = screen.getByTestId('logout-button');
        logoutButton.click();

        // Wait for async operations
        await vi.waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          expect(mockSignOut).toHaveBeenCalled();
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });

      it('still signs out locally if logout API fails', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));
        global.fetch = mockFetch;

        // Mock console.error to avoid noise in test output
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Header />);
        const logoutButton = screen.getByTestId('logout-button');
        logoutButton.click();

        // Wait for async operations
        await vi.waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
          expect(mockSignOut).toHaveBeenCalled();
          expect(mockPush).toHaveBeenCalledWith('/');
        });

        consoleErrorSpy.mockRestore();
      });

      it('redirects to home page after logout', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        global.fetch = mockFetch;

        render(<Header />);
        const logoutButton = screen.getByTestId('logout-button');
        logoutButton.click();

        await vi.waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      });
    });
  });
});

export { GameCard } from './GameCard';
export type { GameCardProps, GameStatus } from './GameCard';

export { Header } from './Header';
export type { HeaderProps } from './Header';

export { Footer } from './Footer';
export type { FooterProps } from './Footer';

// Auth components
export { LoginForm, SignupForm, ForgotPasswordForm } from './auth';
export type { LoginFormProps } from './auth';

// Dashboard components
export {
  WelcomeHeader,
  DashboardGameCard,
  RecentSessions,
  UserPreferences,
} from './dashboard';
export type {
  WelcomeHeaderProps,
  DashboardGameCardProps,
  RecentSessionsProps,
  GameSession,
  GameType,
  UserPreferencesProps,
  UserPreferencesData,
} from './dashboard';

// Button
export { Button, type ButtonProps } from './button';

// Toggle
export { Toggle, type ToggleProps } from './toggle';

// Slider
export { Slider, type SliderProps } from './slider';

// Card
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
} from './card';

// Badge
export { Badge, type BadgeProps, type BadgeColor, type BadgeStyle, type BadgeSize } from './badge';

// Motion presets
export {
  springSmooth,
  springGentle,
  springBouncy,
  springSnappy,
  springHeavy,
  springMicro,
  springResponsive,
  springDialog,
  springNotification,
} from './motion/presets';

// WebVitals
export {
  WebVitals,
  useWebVitals,
  sendToAnalytics,
  type WebVitalsConfig,
  type WebVitalsMetric,
} from './web-vitals';

// Skeleton components
export { Skeleton, type SkeletonProps } from './skeleton';
export { SkeletonCard, type SkeletonCardProps } from './skeleton-card';
export { SkeletonButton, type SkeletonButtonProps } from './skeleton-button';
export { SkeletonText, type SkeletonTextProps } from './skeleton-text';

// Confetti
export { Confetti, type ConfettiProps, type ConfettiOptions } from './confetti';
export { useConfetti, type UseConfettiOptions, type UseConfettiReturn } from './hooks/use-confetti';

// SyncStatusIndicator
export {
  SyncStatusIndicator,
  type SyncStatusIndicatorProps,
  type SyncStatus,
} from './sync-status-indicator';

// Modal
export { Modal, type ModalProps } from './modal';

// Input
export { Input, type InputProps } from './input';

// Toast
export {
  ToastProvider,
  useToast,
  StandaloneToast,
  type Toast,
  type ToastVariant,
  type ToastProviderProps,
  type StandaloneToastProps,
} from './toast';

// Session Management
export { CreateGameModal, type CreateGameModalProps } from './create-game-modal';
export { JoinGameModal, type JoinGameModalProps } from './join-game-modal';
export { RoomCodeDisplay, type RoomCodeDisplayProps } from './room-code-display';

// ThemeSelector
export {
  ThemeSelector,
  DEFAULT_THEME_OPTIONS,
  type ThemeSelectorProps,
  type ThemeOption,
} from './theme-selector';

// RoomSetupModal
export { RoomSetupModal, type RoomSetupModalProps } from './room-setup-modal';

// ErrorBoundary
export { ErrorBoundary, type ErrorBoundaryProps } from './error-boundary';

// KeyboardShortcutsModal
export {
  KeyboardShortcutsModal,
  type KeyboardShortcutsModalProps,
  type KeyboardShortcut,
} from './keyboard-shortcuts-modal';

// OfflineBanner
export { OfflineBanner, type OfflineBannerProps } from './offline-banner';

// Hooks
export { useOnlineStatus, useConnectionInfo } from './hooks/use-online-status';
export { useFullscreen } from './hooks/use-fullscreen';

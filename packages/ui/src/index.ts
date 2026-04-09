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

// Skeleton components
export { Skeleton, type SkeletonProps } from './skeleton';
export { SkeletonCard, type SkeletonCardProps } from './skeleton-card';
export { SkeletonButton, type SkeletonButtonProps } from './skeleton-button';
export { SkeletonText, type SkeletonTextProps } from './skeleton-text';

// Confetti
export { Confetti, type ConfettiProps, type ConfettiOptions } from './confetti';
export { useConfetti, type UseConfettiOptions, type UseConfettiReturn } from './hooks/use-confetti';

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

// ThemeSelector
export {
  ThemeSelector,
  DEFAULT_THEME_OPTIONS,
  type ThemeSelectorProps,
  type ThemeOption,
} from './theme-selector';

// ErrorBoundary
export { ErrorBoundary, type ErrorBoundaryProps } from './error-boundary';

// ErrorBoundaryProvider
export { ErrorBoundaryProvider, type ErrorBoundaryProviderProps } from './error-boundary-provider';

// KeyboardShortcutsModal
export {
  KeyboardShortcutsModal,
  type KeyboardShortcutsModalProps,
  type KeyboardShortcut,
} from './keyboard-shortcuts-modal';

// ServiceWorkerRegistration
export {
  ServiceWorkerRegistration,
  type ServiceWorkerRegistrationProps,
} from './service-worker-registration';

// InstallPrompt
export { InstallPrompt, type InstallPromptProps } from './install-prompt';

// Hooks
export { useFullscreen } from './hooks/use-fullscreen';
export { useApplyTheme, useDisplayTheme, useResolvedTheme } from './hooks/use-theme';

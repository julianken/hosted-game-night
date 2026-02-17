'use client';

import { ReactNode, forwardRef, AnchorHTMLAttributes } from 'react';

export type GameStatus = 'available' | 'coming_soon' | 'maintenance';

export interface GameCardProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Game title */
  title: string;
  /** Brief description of the game */
  description: string;
  /** URL to the game (external link) */
  href: string;
  /** Icon or visual element for the game */
  icon: ReactNode;
  /** Current availability status */
  status?: GameStatus;
  /** Background color/style class */
  colorClass?: string;
}

const statusConfig: Record<GameStatus, { label: string; className: string }> = {
  available: {
    label: 'Ready to Play',
    className: 'bg-success/10 text-success',
  },
  coming_soon: {
    label: 'Coming Soon',
    className: 'bg-warning/10 text-warning',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-muted/20 text-muted-foreground',
  },
};

/**
 * GameCard - A large, accessible card for selecting games.
 * Designed for users with large touch targets, high contrast, and clear CTAs.
 */
export const GameCard = forwardRef<HTMLAnchorElement, GameCardProps>(
  (
    {
      title,
      description,
      href,
      icon,
      status = 'available',
      colorClass = '',
      className = '',
      ...props
    },
    ref
  ) => {
    const isPlayable = status === 'available';
    const statusInfo = statusConfig[status];

    return (
      <a
        ref={ref}
        href={isPlayable ? href : undefined}
        aria-disabled={!isPlayable}
        aria-label={`${title} - ${statusInfo.label}. ${description}`}
        className={`
          block rounded-2xl border-2 border-border
          transition-all duration-200 ease-in-out
          focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
          ${colorClass}
          ${
            isPlayable
              ? 'cursor-pointer hover:border-primary hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]'
              : 'cursor-not-allowed opacity-75'
          }
          ${className}
        `.trim()}
        role="article"
        tabIndex={isPlayable ? 0 : -1}
        {...props}
      >
        <div className="p-5 sm:p-8 md:p-10">
          {/* Icon */}
          <div
            className="w-20 h-20 mb-6 flex items-center justify-center rounded-2xl bg-background/50 text-5xl"
            aria-hidden="true"
          >
            {icon}
          </div>

          {/* Status Badge */}
          <span
            className={`
              inline-block px-4 py-2 rounded-full text-base font-semibold mb-4
              ${statusInfo.className}
            `.trim()}
            role="status"
          >
            {statusInfo.label}
          </span>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {title}
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>

          {/* CTA Button */}
          <div
            className={`
              inline-flex items-center justify-center
              min-h-[56px] px-6 sm:px-8 py-4
              text-lg sm:text-xl font-semibold rounded-lg
              transition-colors duration-150
              ${
                isPlayable
                  ? 'bg-primary text-primary-foreground group-hover:bg-primary/90'
                  : 'bg-muted/30 text-muted-foreground'
              }
            `.trim()}
            aria-hidden="true"
          >
            {isPlayable ? 'Play Now' : statusInfo.label}
            {isPlayable && (
              <svg
                className="ml-2 w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            )}
          </div>
        </div>
      </a>
    );
  }
);

GameCard.displayName = 'GameCard';

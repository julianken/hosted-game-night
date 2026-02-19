'use client';

import { ReactNode, forwardRef, AnchorHTMLAttributes } from 'react';
import { Card } from '@joolie-boolie/ui';

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
  /** Background color/style class (kept for backward compat) */
  colorClass?: string;
  /** CSS color value for the left accent border (e.g. var(--game-bingo)) */
  accentColor?: string;
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
    className: 'bg-muted-foreground/20 text-muted-foreground',
  },
};

/**
 * GameCard - A large, accessible card for selecting games.
 * Uses shared Card component (variant="interactive") with game-brand accent border.
 * Designed with 44px minimum touch targets and high contrast per accessibility audit.
 */
export const GameCard = forwardRef<HTMLAnchorElement, GameCardProps>(
  (
    {
      title,
      description,
      href,
      icon,
      status = 'available',
      colorClass: _colorClass,
      accentColor,
      className = '',
      ...props
    },
    _ref
  ) => {
    const isPlayable = status === 'available';
    const statusInfo = statusConfig[status];

    return (
      <Card
        variant={isPlayable ? 'interactive' : 'default'}
        className={[
          'relative',
          !isPlayable ? 'opacity-75' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          accentColor
            ? { borderLeft: `3px solid ${accentColor}` }
            : undefined
        }
      >
        <a
          href={isPlayable ? href : undefined}
          aria-disabled={!isPlayable}
          aria-label={`${title} - ${statusInfo.label}. ${description}`}
          className={[
            'block p-5 sm:p-6',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl',
            isPlayable ? 'cursor-pointer' : 'cursor-not-allowed',
          ]
            .filter(Boolean)
            .join(' ')}
          role="article"
          tabIndex={isPlayable ? 0 : -1}
          {...props}
        >
          {/* Icon + Status row */}
          <div className="flex items-start justify-between mb-4">
            {/* Icon */}
            <div
              className="w-16 h-16 flex items-center justify-center rounded-xl"
              style={{
                background: accentColor
                  ? `color-mix(in srgb, ${accentColor} 15%, transparent)`
                  : 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: accentColor || 'var(--primary)',
              }}
              aria-hidden="true"
            >
              {icon}
            </div>

            {/* Status badge */}
            <span
              className={[
                'inline-block px-3 py-1 rounded-full text-sm font-semibold',
                statusInfo.className,
              ].join(' ')}
              role="status"
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>

          {/* Description */}
          <p className="text-base text-foreground-secondary mb-5 leading-relaxed">
            {description}
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-2">
            <div
              className={[
                'inline-flex items-center justify-center',
                'min-h-[44px] px-5 py-2',
                'text-base font-semibold rounded-lg',
                'transition-colors duration-150',
                isPlayable
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted-foreground/20 text-muted-foreground',
              ].join(' ')}
              aria-hidden="true"
            >
              {isPlayable ? 'Play Now' : statusInfo.label}
              {isPlayable && (
                <svg
                  className="ml-2 w-5 h-5"
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
      </Card>
    );
  }
);

GameCard.displayName = 'GameCard';

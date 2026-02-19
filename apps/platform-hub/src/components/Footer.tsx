'use client';

import { HTMLAttributes, forwardRef } from 'react';

export type FooterProps = HTMLAttributes<HTMLElement>;

/**
 * Footer - Simple platform footer.
 * Uses --foreground-secondary for text (Issue A-06: contrast fix).
 * Links hover to --foreground.
 */
export const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className = '', ...props }, ref) => {
    const currentYear = new Date().getFullYear();

    return (
      <footer
        ref={ref}
        className={[
          'w-full py-6 sm:py-8 px-4 sm:px-6 md:px-8',
          'border-t',
          'mb-14 md:mb-0',  /* Space for mobile bottom tab bar */
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'color-mix(in srgb, var(--surface) 40%, transparent)',
        }}
        role="contentinfo"
        {...props}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright — Issue A-06: use foreground-secondary (not stone-500) */}
            <p
              className="text-base text-center md:text-left"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              &copy; {currentYear} Joolie Boolie. All rights reserved.
            </p>

            {/* Links */}
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap items-center justify-center gap-6">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Help', href: '/help' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="
                        text-base
                        hover:text-foreground
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                        rounded
                        transition-colors duration-150
                      "
                      style={{ color: 'var(--foreground-secondary)' }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Accessibility note */}
          <p
            className="mt-4 text-sm text-center"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Designed with accessibility in mind for groups and communities.
          </p>
        </div>
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

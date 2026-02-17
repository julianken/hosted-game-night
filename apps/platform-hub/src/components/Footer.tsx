'use client';

import { HTMLAttributes, forwardRef } from 'react';

export type FooterProps = HTMLAttributes<HTMLElement>;

/**
 * Footer - Simple platform footer.
 * Clean footer with copyright and basic links.
 */
export const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className = '', ...props }, ref) => {
    const currentYear = new Date().getFullYear();

    return (
      <footer
        ref={ref}
        className={`
          w-full py-6 sm:py-8 px-4 sm:px-6 md:px-8
          border-t border-border
          bg-muted/5
          ${className}
        `.trim()}
        role="contentinfo"
        {...props}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <p className="text-lg text-muted-foreground text-center md:text-left">
              &copy; {currentYear} Joolie Boolie. All rights reserved.
            </p>

            {/* Links */}
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap items-center justify-center gap-6">
                <li>
                  <a
                    href="/about"
                    className="
                      text-lg text-muted-foreground
                      hover:text-primary
                      focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
                      rounded
                      transition-colors duration-150
                    "
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="/help"
                    className="
                      text-lg text-muted-foreground
                      hover:text-primary
                      focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
                      rounded
                      transition-colors duration-150
                    "
                  >
                    Help
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="
                      text-lg text-muted-foreground
                      hover:text-primary
                      focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50
                      rounded
                      transition-colors duration-150
                    "
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Accessibility note */}
          <p className="mt-6 text-base text-muted-foreground/70 text-center">
            Designed with accessibility in mind for groups and communities.
          </p>
        </div>
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

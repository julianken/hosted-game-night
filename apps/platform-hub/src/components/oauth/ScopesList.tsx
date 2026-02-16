import type { JSX } from 'react';
import { categorizeScopes } from '@/lib/oauth/scopes';

export interface ScopesListProps {
  scopes: string[];
}

/**
 * Icon for each scope type
 */
function ScopeIcon({ icon }: { icon: string }) {
  const icons: Record<string, JSX.Element> = {
    profile: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
    refresh: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    ),
    default: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  };

  return icons[icon] || icons.default;
}

/**
 * ScopesList - Displays requested OAuth scopes
 *
 * Lists permissions the app is requesting with icons and descriptions
 * Categorizes into required vs optional scopes
 */
export function ScopesList({ scopes }: ScopesListProps) {
  const { required, optional } = categorizeScopes(scopes);
  const allScopes = [...required, ...optional];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        This app will be able to:
      </h3>
      <ul className="space-y-2" role="list">
        {allScopes.map((scope, index) => (
          <li
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
              <ScopeIcon icon={scope.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">
                {scope.name}
                {scope.required && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    (Required)
                  </span>
                )}
              </p>
              <p className="text-base text-muted-foreground mt-0.5">
                {scope.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

ScopesList.displayName = 'ScopesList';

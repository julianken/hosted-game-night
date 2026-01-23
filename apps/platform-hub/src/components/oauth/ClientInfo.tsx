import type { ClientInfo as ClientInfoType } from '@/types/oauth';

export interface ClientInfoProps {
  client: ClientInfoType;
}

/**
 * ClientInfo - Displays OAuth client application details
 *
 * Shows client name, logo, description, and redirect URI
 * Senior-friendly design with large fonts and clear layout
 */
export function ClientInfo({ client }: ClientInfoProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border-2 border-border">
      {/* Client logo/icon */}
      {client.logo_uri ? (
        // eslint-disable-next-line @next/next/no-img-element -- External OAuth client logo, not optimizable with next/image
        <img
          src={client.logo_uri}
          alt={`${client.name} logo`}
          className="w-16 h-16 rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Client details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-bold text-foreground mb-1">{client.name}</h3>
        {client.description && (
          <p className="text-base text-muted-foreground mb-2">
            {client.description}
          </p>
        )}
      </div>
    </div>
  );
}

ClientInfo.displayName = 'ClientInfo';

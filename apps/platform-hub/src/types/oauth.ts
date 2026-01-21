/**
 * OAuth 2.1 Type Definitions for Platform Hub
 *
 * Based on Supabase OAuth SDK response structures
 */

/**
 * Client information returned from authorization details
 */
export interface ClientInfo {
  id: string;
  name: string;
  description?: string;
  logo_uri?: string;
}

/**
 * User information in authorization context
 */
export interface UserInfo {
  id: string;
  email: string;
}

/**
 * Authorization details response from Supabase
 * Returned by supabase.auth.oauth.getAuthorizationDetails()
 */
export interface AuthorizationDetails {
  client: ClientInfo;
  scopes: string[];
  user: UserInfo;
  redirect_uri?: string;
}

/**
 * Response from authorization approval/denial
 * Returned by approve/denyAuthorization()
 */
export interface ConsentResponse {
  redirect_to: string;
}

/**
 * Metadata for displaying scopes to users
 */
export interface ScopeMetadata {
  name: string;
  description: string;
  icon: string;
  required?: boolean;
}

/**
 * Consent screen UI state
 */
export type ConsentState = 'loading' | 'error' | 'consent' | 'success';

/**
 * Error state for consent flow
 */
export interface ConsentError {
  message: string;
  code?: string;
  details?: string;
}

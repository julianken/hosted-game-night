/**
 * React hooks for database operations
 *
 * @deprecated Scheduled for removal. See R-9a.
 * The `@joolie-boolie/database/hooks` subpath export is unused.
 */

export {
  useQuery,
  useParamQuery,
  useListQuery,
  type QueryStatus,
  type QueryState,
  type QueryOptions,
  type QueryResult,
  type ListQueryOptions,
} from './use-query';

export {
  useMutation,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
  useOptimisticMutation,
  type MutationStatus,
  type MutationState,
  type MutationOptions,
  type MutationResult,
  type UpdateVariables,
  type OptimisticMutationOptions,
} from './use-mutation';

export {
  useGameSession,
  useCreateGameSession,
  useUpdateGameSessionState,
  useMarkSessionCompleted,
  useVerifyPin,
  type VerifyPinVariables,
  type VerifyPinResult,
  type UpdateGameStateVariables,
} from './use-game-session';

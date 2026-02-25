/**
 * Filter and search utilities for database queries
 *
 * @deprecated Scheduled for removal. See R-9a.
 * The `@joolie-boolie/database/filters` subpath export is unused.
 * Internal usage (e.g. by queries.ts) will be inlined before removal.
 */

// =============================================================================
// Types
// =============================================================================

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'contains'
  | 'containedBy'
  | 'overlaps'
  | 'textSearch';

export interface FilterCondition {
  /** Column name to filter on */
  column: string;
  /** Filter operator */
  operator: FilterOperator;
  /** Value to compare against */
  value: unknown;
}

export interface SortCondition {
  /** Column name to sort by */
  column: string;
  /** Sort direction */
  ascending?: boolean;
  /** Nulls position */
  nullsFirst?: boolean;
  /** Use case-insensitive sorting for text */
  foreignTable?: string;
}

export interface SearchParams {
  /** Search query string */
  query?: string;
  /** Columns to search in */
  searchColumns?: string[];
  /** Filters to apply */
  filters?: FilterCondition[];
  /** Sort order */
  sort?: SortCondition[];
}

// Generic query builder type - works with any Supabase query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

// =============================================================================
// Filter Builder Functions
// =============================================================================

/**
 * Applies a single filter condition to a query builder
 */
export function applyFilter(query: QueryBuilder, filter: FilterCondition): QueryBuilder {
  const { column, operator, value } = filter;

  switch (operator) {
    case 'eq':
      return query.eq(column, value);
    case 'neq':
      return query.neq(column, value);
    case 'gt':
      return query.gt(column, value);
    case 'gte':
      return query.gte(column, value);
    case 'lt':
      return query.lt(column, value);
    case 'lte':
      return query.lte(column, value);
    case 'like':
      return query.like(column, value as string);
    case 'ilike':
      return query.ilike(column, value as string);
    case 'is':
      return query.is(column, value as boolean | null);
    case 'in':
      return query.in(column, value as unknown[]);
    case 'contains':
      return query.contains(column, value as unknown);
    case 'containedBy':
      return query.containedBy(column, value as unknown);
    case 'overlaps':
      return query.overlaps(column, value as unknown);
    case 'textSearch':
      return query.textSearch(column, value as string);
    default:
      return query;
  }
}

/**
 * Applies multiple filter conditions to a query builder
 */
export function applyFilters(query: QueryBuilder, filters: FilterCondition[]): QueryBuilder {
  return filters.reduce((q, filter) => applyFilter(q, filter), query);
}

/**
 * Applies a single sort condition to a query builder
 */
export function applySort(query: QueryBuilder, sort: SortCondition): QueryBuilder {
  return query.order(sort.column, {
    ascending: sort.ascending ?? true,
    nullsFirst: sort.nullsFirst ?? false,
    ...(sort.foreignTable && { foreignTable: sort.foreignTable }),
  });
}

/**
 * Applies multiple sort conditions to a query builder
 */
export function applySorts(query: QueryBuilder, sorts: SortCondition[]): QueryBuilder {
  return sorts.reduce((q, sort) => applySort(q, sort), query);
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Creates a text search filter for multiple columns
 * Uses OR logic to match any of the columns
 */
export function createTextSearchFilter(query: string, columns: string[]): string {
  if (!query.trim() || columns.length === 0) {
    return '';
  }

  const escapedQuery = query.replace(/[%_]/g, '\\$&');
  const pattern = `%${escapedQuery}%`;

  // Creates an OR filter like: "column1.ilike.%query%,column2.ilike.%query%"
  return columns.map((col) => `${col}.ilike.${pattern}`).join(',');
}

/**
 * Applies text search across multiple columns using OR logic
 */
export function applyTextSearch(
  query: QueryBuilder,
  searchQuery: string,
  columns: string[]
): QueryBuilder {
  if (!searchQuery.trim() || columns.length === 0) {
    return query;
  }

  const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&');
  const pattern = `%${escapedQuery}%`;

  // Use .or() for multiple column search
  const orConditions = columns.map((col) => `${col}.ilike.${pattern}`).join(',');
  return query.or(orConditions);
}

// =============================================================================
// Filter Helpers
// =============================================================================

/**
 * Creates common filter conditions
 */
export const filters = {
  /** Equal to */
  eq: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'eq',
    value,
  }),

  /** Not equal to */
  neq: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'neq',
    value,
  }),

  /** Greater than */
  gt: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'gt',
    value,
  }),

  /** Greater than or equal */
  gte: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'gte',
    value,
  }),

  /** Less than */
  lt: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'lt',
    value,
  }),

  /** Less than or equal */
  lte: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'lte',
    value,
  }),

  /** Pattern match (case-sensitive) */
  like: (column: string, pattern: string): FilterCondition => ({
    column,
    operator: 'like',
    value: pattern,
  }),

  /** Pattern match (case-insensitive) */
  ilike: (column: string, pattern: string): FilterCondition => ({
    column,
    operator: 'ilike',
    value: pattern,
  }),

  /** Is null/true/false */
  is: (column: string, value: boolean | null): FilterCondition => ({
    column,
    operator: 'is',
    value,
  }),

  /** In array */
  in: (column: string, values: unknown[]): FilterCondition => ({
    column,
    operator: 'in',
    value: values,
  }),

  /** Contains (for arrays/JSONB) */
  contains: (column: string, value: unknown): FilterCondition => ({
    column,
    operator: 'contains',
    value,
  }),

  /** Full text search */
  textSearch: (column: string, query: string): FilterCondition => ({
    column,
    operator: 'textSearch',
    value: query,
  }),

  /** Created after date */
  createdAfter: (date: Date | string): FilterCondition => ({
    column: 'created_at',
    operator: 'gte',
    value: typeof date === 'string' ? date : date.toISOString(),
  }),

  /** Created before date */
  createdBefore: (date: Date | string): FilterCondition => ({
    column: 'created_at',
    operator: 'lte',
    value: typeof date === 'string' ? date : date.toISOString(),
  }),

  /** Updated after date */
  updatedAfter: (date: Date | string): FilterCondition => ({
    column: 'updated_at',
    operator: 'gte',
    value: typeof date === 'string' ? date : date.toISOString(),
  }),

  /** Updated before date */
  updatedBefore: (date: Date | string): FilterCondition => ({
    column: 'updated_at',
    operator: 'lte',
    value: typeof date === 'string' ? date : date.toISOString(),
  }),

  /** Filter by user ID */
  byUser: (userId: string): FilterCondition => ({
    column: 'user_id',
    operator: 'eq',
    value: userId,
  }),
};

/**
 * Creates common sort conditions
 */
export const sorts = {
  /** Sort by creation date (newest first) */
  newestFirst: (): SortCondition => ({
    column: 'created_at',
    ascending: false,
  }),

  /** Sort by creation date (oldest first) */
  oldestFirst: (): SortCondition => ({
    column: 'created_at',
    ascending: true,
  }),

  /** Sort by update date (most recent first) */
  recentlyUpdated: (): SortCondition => ({
    column: 'updated_at',
    ascending: false,
  }),

  /** Sort by name alphabetically */
  byName: (ascending = true): SortCondition => ({
    column: 'name',
    ascending,
  }),

  /** Custom sort */
  by: (column: string, ascending = true): SortCondition => ({
    column,
    ascending,
  }),
};

// =============================================================================
// URL Parameter Helpers
// =============================================================================

/**
 * Parses filter parameters from URL search params
 * Expects format: filter[column]=operator:value
 */
export function parseFiltersFromParams(searchParams: URLSearchParams): FilterCondition[] {
  const filterConditions: FilterCondition[] = [];

  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match) {
      const column = match[1];
      const [operator, ...valueParts] = value.split(':');
      const filterValue = valueParts.join(':');

      if (isValidOperator(operator)) {
        filterConditions.push({
          column,
          operator,
          value: parseFilterValue(filterValue),
        });
      }
    }
  }

  return filterConditions;
}

/**
 * Parses sort parameters from URL search params
 * Expects format: sort=column:asc or sort=column:desc
 */
export function parseSortsFromParams(searchParams: URLSearchParams): SortCondition[] {
  const sortParam = searchParams.get('sort');
  if (!sortParam) {
    return [];
  }

  return sortParam.split(',').map((s) => {
    const [column, direction] = s.split(':');
    return {
      column,
      ascending: direction !== 'desc',
    };
  });
}

function isValidOperator(op: string): op is FilterOperator {
  return [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'overlaps',
    'textSearch',
  ].includes(op);
}

function parseFilterValue(value: string): unknown {
  // Handle null
  if (value === 'null') return null;
  // Handle boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Handle arrays (comma-separated)
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((v) => v.trim());
  }
  // Handle numbers
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  // Default to string
  return value;
}

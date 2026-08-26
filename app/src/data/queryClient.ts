import { QueryClient } from '@tanstack/react-query'
import { isAppError } from './errors'

/**
 * The query client.
 *
 * Retry policy is the interesting part. A 42501 is RLS saying no — retrying it
 * four times just makes the user wait to be refused again, and hammers the
 * database while doing it. Only genuinely transient failures are retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field officers are on slow connections; 30s of reuse avoids refetching
      // a partner list every time they cross a screen boundary.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (isAppError(error)) {
          // A refusal, a duplicate or bad data will be refused identically on
          // the next attempt. Offline is handled by the reconnect listener.
          if (
            error.kind === 'forbidden' ||
            error.kind === 'duplicate' ||
            error.kind === 'invalid' ||
            error.kind === 'unauthenticated' ||
            error.kind === 'missing_reference'
          ) {
            return false
          }
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Writes are never retried automatically: a create that actually
      // succeeded but whose response was lost would be inserted twice. The
      // offline queue owns re-sending, and it is idempotent via client_uuid.
      retry: false,
    },
  },
})

/**
 * Query keys, in one place.
 *
 * Every key is a factory, so an invalidation cannot drift from the read that
 * created it. `qk.partnerships.list('training')` invalidated by
 * `qk.partnerships.all` works because the list key starts with the all key.
 */
export const qk = {
  ref: (table: string) => ['ref', table] as const,

  partnerships: {
    all: ['partnerships'] as const,
    list: (type: 'training' | 'production_support') => ['partnerships', 'list', type] as const,
    detail: (id: string) => ['partnerships', 'detail', id] as const,
  },

  exhibitions: {
    all: ['exhibitions'] as const,
    list: () => ['exhibitions', 'list'] as const,
    detail: (id: string) => ['exhibitions', 'detail', id] as const,
    /** Booth counts, read from the view so the UI never counts rows itself. */
    availability: () => ['exhibitions', 'availability'] as const,
  },

  enrolments: {
    all: ['enrolments'] as const,
    list: () => ['enrolments', 'list'] as const,
    detail: (id: string) => ['enrolments', 'detail', id] as const,
  },

  registrations: {
    all: ['registrations'] as const,
    list: () => ['registrations', 'list'] as const,
    detail: (id: string) => ['registrations', 'detail', id] as const,
    mine: () => ['registrations', 'mine'] as const,
  },

  linkages: {
    all: ['linkages'] as const,
    list: () => ['linkages', 'list'] as const,
    detail: (id: string) => ['linkages', 'detail', id] as const,
  },

  manual: {
    all: ['manual'] as const,
    list: (periodId: string) => ['manual', 'list', periodId] as const,
  },

  followups: {
    all: ['followups'] as const,
    list: () => ['followups', 'list'] as const,
    detail: (id: string) => ['followups', 'detail', id] as const,
    prefill: (nationalId: string) => ['followups', 'prefill', nationalId] as const,
  },

  people: {
    all: ['people'] as const,
    byNationalId: (nid: string) => ['people', 'nid', nid] as const,
    completions: () => ['people', 'completions'] as const,
  },

  periods: {
    current: () => ['periods', 'current'] as const,
  },
} as const

import { useQuery } from '@tanstack/react-query'
import type { ModuleId } from '../modules'
import { supabase } from '../lib/supabase'
import { toAppError } from './errors'
import { qk } from './queryClient'
import { useModuleCounts as useMockCounts } from '../hooks/useData'

/**
 * The counts beside each nav item.
 *
 * A `head: true` count query, so the rows never cross the wire — the rail needs
 * a number, not the records. Counting on the server is also the only way to get
 * this right once lists are paginated.
 *
 * These MUST agree with the list screen. A rail saying 4 next to a list showing
 * 1 is the kind of small inconsistency that makes a coordinator distrust every
 * other number on the screen, so a module's count moves to the database in the
 * same step as its list.
 *
 * NOT an indicator. Phase 5 reads `v_indicator_actual` for anything reported;
 * this is a navigation affordance and nothing else.
 */
function useLiveCount(module: 'tp' | 'pp', enabled: boolean) {
  const type = module === 'tp' ? 'training' : 'production_support'
  return useQuery({
    queryKey: [...qk.partnerships.list(type), 'count'],
    enabled,
    queryFn: async (): Promise<number> => {
      const res = await supabase
        .from('partnership')
        .select('id, partner!inner(deleted_at)', { count: 'exact', head: true })
        .eq('partnership_type', type)
        .is('deleted_at', null)
        .is('partner.deleted_at', null)
      if (res.error) throw toAppError(res.error)
      return res.count ?? 0
    },
  })
}

/**
 * Counts for the rail.
 *
 * Live modules read the database; the rest still read the mock file. A live
 * count that has not arrived yet shows the mock value rather than flashing a
 * zero — a zero next to a module that has records reads as "empty", which is a
 * worse lie than a stale number for half a second.
 */
export function useNavCounts(): Record<ModuleId, number> {
  const mock = useMockCounts()
  const tp = useLiveCount('tp', true)
  const pp = useLiveCount('pp', true)

  return {
    ...mock,
    tp: tp.data ?? mock.tp,
    pp: pp.data ?? mock.pp,
  }
}

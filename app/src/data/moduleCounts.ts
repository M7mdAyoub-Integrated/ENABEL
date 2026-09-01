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
/**
 * ORGANISATIONS, not partnerships.
 *
 * The rail used to carry two numbers, one per partnership type, which summed to
 * more than the number of bodies the Municipality works with whenever one held
 * both. G0.4 counts distinct partners, so the count beside a merged list has to
 * be partners too or the rail and the dashboard describe different things.
 */
function usePartnerCount() {
  return useQuery({
    queryKey: [...qk.partnerships.all, 'partners', 'count'],
    queryFn: async (): Promise<number> => {
      const res = await supabase
        .from('partner')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (res.error) throw toAppError(res.error)
      return res.count ?? 0
    },
  })
}

/**
 * Exhibitions and training completions.
 *
 * Both modules went live without their badge following, so the rail read
 * "Exhibitions 4" beside a list showing "2 OF 2" and "Training completion 6"
 * beside "5 OF 5" -- the exact inconsistency the note on useNavCounts warns
 * about, sitting in the navigation for weeks.
 */
function useSimpleCount(
  key: string,
  table: 'exhibition' | 'training_enrolment',
) {
  return useQuery({
    queryKey: [key, 'count'],
    queryFn: async (): Promise<number> => {
      const res = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (res.error) throw toAppError(res.error)
      return res.count ?? 0
    },
  })
}

/** Visits recorded by the coordination office. See the note in useNavCounts. */
function useOfficeCount() {
  return useQuery({
    queryKey: ['office-services', 'count'],
    queryFn: async (): Promise<number> => {
      const res = await supabase
        .from('office_service')
        .select('id, person!inner(deleted_at)', { count: 'exact', head: true })
        .is('deleted_at', null)
        .is('person.deleted_at', null)
      if (res.error) throw toAppError(res.error)
      return res.count ?? 0
    },
  })
}

/** Guidance records logged. See the note in useNavCounts. */
function useGuidanceCount() {
  return useQuery({
    queryKey: ['guidance-records', 'count'],
    queryFn: async (): Promise<number> => {
      const res = await supabase
        .from('guidance_record')
        .select('id, person!inner(deleted_at)', { count: 'exact', head: true })
        .is('deleted_at', null)
        .is('person.deleted_at', null)
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
  const pn = usePartnerCount()
  const os = useOfficeCount()
  const gd = useGuidanceCount()
  const ex = useSimpleCount('exhibitions', 'exhibition')
  const tc = useSimpleCount('completions', 'training_enrolment')

  return {
    ...mock,
    pn: pn.data ?? mock.pn,
    ex: ex.data ?? mock.ex,
    tc: tc.data ?? mock.tc,
    // Counts VISITS, not people. B1.2 counts people, and the two differ the
    // moment anyone comes twice -- so this number must never be read as B1.2.
    os: os.data ?? mock.os,
    // Counts RECORDS, not producers. D0.1 counts producers, and the two differ
    // the moment anyone is helped twice -- so this number must never be read
    // as D0.1.
    gd: gd.data ?? mock.gd,
  }
}

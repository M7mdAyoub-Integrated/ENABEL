/**
 * THE PHASE 4 SEAM.
 *
 * Every component reads data through these hooks and never touches
 * `src/mocks/data.ts`. When real data arrives, each hook body becomes a
 * TanStack Query call against Supabase and returns the same shape. No component
 * changes.
 *
 * Rows returned here are DB-shaped (`database.ts` Row types) and joined into
 * small view-models where a screen needs a name rather than a foreign key. That
 * join is exactly what a Supabase `select(...)` with embedded resources will
 * return, so the view-model shapes survive the swap too.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import * as db from '../mocks/data'
import { formatShortDate, formatDateRange } from '../lib/format'
import type { ModuleId, ChipKind } from '../modules'
import type { Translate } from '../i18n/tx'

/** Re-exported so only this module imports the mock layer. */
export type { RefRow } from '../mocks/data'

/* ── mutable session state ──────────────────────────────────────────────────
   The prototype kept deletions, approvals and portal submissions in component
   state. Here they live in a tiny store so they survive navigation between
   routes, which the prototype never had to handle because it never navigated.
   Phase 4 deletes this entirely -- the server becomes the source of truth. */

type SessionState = {
  deleted: Set<string>
  regStatus: Record<string, 'submitted' | 'approved' | 'rejected'>
  extraRegistrations: db.ExhibitionRegistration[]
  extraRegProducts: Record<string, string[]>
  manualValues: Record<string, string>
}

let session: SessionState = {
  deleted: new Set(),
  regStatus: {},
  extraRegistrations: [],
  extraRegProducts: {},
  manualValues: {},
}

const listeners = new Set<() => void>()
function emit() {
  session = { ...session }
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function getSnapshot() {
  return session
}

function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/* ── reference lookups ──────────────────────────────────────────────────── */

const REF_TABLES = {
  partner_type_training: db.REF_PARTNER_TYPE_TRAINING,
  partner_role_training: db.REF_PARTNER_ROLE_TRAINING,
  partner_type_production: db.REF_PARTNER_TYPE_PRODUCTION,
  partner_role_production: db.REF_PARTNER_ROLE_PRODUCTION,
  training_topic: db.REF_TRAINING_TOPIC,
  agri_involvement: db.REF_AGRI_INVOLVEMENT,
  activity_type: db.REF_ACTIVITY_TYPE,
  product: db.REF_PRODUCT,
  producer_type: db.REF_PRODUCER_TYPE,
} as const

export type RefTableName = keyof typeof REF_TABLES

export function useRefTable(name: RefTableName): db.RefRow[] {
  return REF_TABLES[name]
}

/**
 * Resolves a ref_* row to a display label for the active locale.
 *
 * `label_ar` is null across every ref table in the real database. Rather than
 * render blank, this falls back to `label_en` and warns once per key -- the
 * same never-blank contract the i18n rig has for UI strings. Build plan
 * section 3: "it must never render a blank".
 */
const warned = new Set<string>()
export function refLabel(row: db.RefRow | undefined, locale: string): string {
  if (!row) return ''
  if (locale.startsWith('ar')) {
    if (row.label_ar) return row.label_ar
    if (!warned.has(row.id)) {
      warned.add(row.id)
      console.warn(
        `[i18n] ref label_ar missing for "${row.code}" (id ${row.id}) — falling back to English.`,
      )
    }
  }
  return row.label_en
}

export function useRefLookup(name: RefTableName) {
  const rows = useRefTable(name)
  return useCallback(
    (id: string | null | undefined, locale: string) =>
      refLabel(
        rows.find((r) => r.id === id),
        locale,
      ),
    [rows],
  )
}

/* ── derived helpers ────────────────────────────────────────────────────── */

export function personById(id: string): { national_id: string; full_name: string; phone: string | null } | undefined {
  const p = db.PEOPLE.find((x) => x.id === id)
  if (p) return { national_id: p.national_id, full_name: p.full_name, phone: p.phone }
  const ext = db.EXTERNAL_PRODUCERS[id]
  if (ext) return ext
  return undefined
}

export function personByNationalId(nid: string) {
  return db.PEOPLE.find((p) => p.national_id === nid)
}

export function exhibitionHasEnded(ex: db.Exhibition): boolean {
  return new Date(ex.end_date) < db.TODAY
}

export function exhibitionIsFull(ex: db.Exhibition, taken: number): boolean {
  return taken >= ex.booth_capacity
}

/* ── list rows: one view-model per module ───────────────────────────────── */

export type Cell =
  | { kind: 'text'; text: string; sub?: string }
  | { kind: 'ltr'; text: string }
  | { kind: 'chip'; text: string; tone: ChipKind }

export type ListRow = {
  id: string
  cells: Cell[]
  /** Value the filter dropdown matches against, already localised. */
  filterValue: string
  /** Free-text search haystack, already localised. */
  search: string
}

function chip(text: string, tone: ChipKind): Cell {
  return { kind: 'chip', text, tone }
}


/**
 * Builds list rows for a module.
 *
 * `t` and `locale` come from the caller so every string is translated at the
 * point of construction -- there is no path where a raw enum value reaches the
 * screen.
 */
export function useListRows(module: ModuleId, t: Translate, locale: string): ListRow[] {
  const s = useSession()

  return useMemo(() => {
    const typeTraining = (id: string | null) =>
      refLabel(db.REF_PARTNER_TYPE_TRAINING.find((r) => r.id === id), locale)
    const typeProduction = (id: string | null) =>
      refLabel(db.REF_PARTNER_TYPE_PRODUCTION.find((r) => r.id === id), locale)
    const roleLabel = (ids: string[], training: boolean) =>
      ids
        .map((id) =>
          refLabel(
            (training ? db.REF_PARTNER_ROLE_TRAINING : db.REF_PARTNER_ROLE_PRODUCTION).find(
              (r) => r.id === id,
            ),
            locale,
          ),
        )
        .join(', ')

    const notDeleted = (id: string) => !s.deleted.has(`${module}:${id}`)

    if (module === 'tp' || module === 'pp') {
      const wantType = module === 'tp' ? 'training' : 'production_support'
      return db.PARTNERSHIPS.filter((ps) => ps.partnership_type === wantType)
        .filter((ps) => notDeleted(ps.id))
        .map((ps) => {
          const partner = db.PARTNERS.find((p) => p.id === ps.partner_id)!
          const typeText =
            module === 'tp'
              ? typeTraining(ps.partner_type_id)
              : typeProduction(ps.partner_type_id)
          const roles = roleLabel(db.PARTNERSHIP_ROLES[ps.id] ?? [], module === 'tp')
          return {
            id: ps.id,
            filterValue: typeText,
            search: `${partner.name} ${partner.contact_person ?? ''}`,
            cells: [
              { kind: 'text', text: partner.name, ...(partner.unit ? { sub: partner.unit } : {}) },
              { kind: 'text', text: typeText },
              { kind: 'text', text: roles },
              { kind: 'text', text: partner.contact_person ?? '' },
              { kind: 'ltr', text: partner.phone ?? '' },
            ],
          } satisfies ListRow
        })
    }

    if (module === 'tc') {
      return db.TRAINING_ENROLMENTS.filter((e) => notDeleted(e.id)).map((e) => {
        const person = db.PEOPLE.find((p) => p.id === e.person_id)!
        const sessionRow = db.TRAINING_SESSIONS.find((x) => x.id === e.session_id)!
        const topic = refLabel(
          db.REF_TRAINING_TOPIC.find((r) => r.id === sessionRow.topic_id),
          locale,
        )
        return {
          id: e.id,
          filterValue: topic,
          search: `${person.national_id} ${person.full_name}`,
          cells: [
            { kind: 'ltr', text: person.national_id },
            { kind: 'text', text: person.full_name },
            { kind: 'text', text: t(`common:enums.sex.${person.sex ?? 'unknown'}`) },
            { kind: 'text', text: person.age_recorded == null ? '' : String(person.age_recorded) },
            { kind: 'text', text: topic },
            { kind: 'text', text: formatShortDate(sessionRow.start_date, locale) },
            e.met_criteria
              ? chip(t('common:chips.metCriteria'), 'ok')
              : chip(t('common:chips.notMet'), 'err'),
          ],
        } satisfies ListRow
      })
    }

    if (module === 'ln') {
      return db.LINKAGES.filter((l) => notDeleted(l.id)).map((l) => {
        const personId = db.INITIATIVE_PERSON[l.initiative_id]!
        const person = db.PEOPLE.find((p) => p.id === personId)!
        const ps = db.PARTNERSHIPS.find((x) => x.id === l.partnership_id)!
        const partner = db.PARTNERS.find((p) => p.id === ps.partner_id)!
        return {
          id: l.id,
          filterValue: partner.name,
          search: `${person.full_name} ${partner.name}`,
          cells: [
            { kind: 'text', text: person.full_name, sub: person.national_id },
            { kind: 'text', text: partner.name },
            { kind: 'text', text: l.scope },
            { kind: 'text', text: l.linked_on },
          ],
        } satisfies ListRow
      })
    }

    if (module === 'ex') {
      return db.EXHIBITIONS.filter((e) => notDeleted(e.id)).map((e) => {
        const held = exhibitionHasEnded(e)
        return {
          id: e.id,
          filterValue: held ? t('common:chips.held') : t('common:chips.upcoming'),
          search: `${e.name} ${e.location}`,
          cells: [
            { kind: 'text', text: e.name },
            { kind: 'text', text: formatDateRange(e.start_date, e.end_date, locale) },
            { kind: 'text', text: e.location },
            {
              kind: 'text',
              text: t('common:units.days', {
                count:
                  Math.round(
                    (new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000,
                  ) + 1,
              }),
            },
            { kind: 'text', text: t('common:units.booths', { count: e.booth_capacity }) },
            held ? chip(t('common:chips.held'), 'mute') : chip(t('common:chips.upcoming'), 'warn'),
          ],
        } satisfies ListRow
      })
    }

    if (module === 'rg') {
      const all = [...db.REGISTRATIONS, ...s.extraRegistrations]
      return all
        .filter((r) => notDeleted(r.id))
        .map((r) => {
          const person = personById(r.person_id)!
          const ex = db.EXHIBITIONS.find((e) => e.id === r.exhibition_id)!
          const status = s.regStatus[r.id] ?? r.status
          const products = (db.REGISTRATION_PRODUCTS[r.id] ?? s.extraRegProducts[r.id] ?? [])
            .map((id) => refLabel(db.REF_PRODUCT.find((p) => p.id === id), locale))
            .join(', ')
          const tone: ChipKind =
            status === 'approved' ? 'ok' : status === 'rejected' ? 'err' : 'pending'
          return {
            id: r.id,
            filterValue: t(`common:chips.status.${status}`),
            search: `${person.full_name} ${person.national_id}`,
            cells: [
              { kind: 'text', text: person.full_name },
              { kind: 'ltr', text: person.national_id },
              { kind: 'text', text: ex.name },
              { kind: 'text', text: products },
              r.is_first_time
                ? chip(t('common:chips.firstTime'), 'ok')
                : chip(t('common:chips.returning'), 'mute'),
              chip(t(`common:chips.status.${status}`), tone),
            ],
          } satisfies ListRow
        })
    }

    // fu
    return db.SURVEYS.filter((f) => notDeleted(f.id)).map((f) => {
      const person = db.PEOPLE.find((p) => p.id === f.person_id)!
      const tone: ChipKind =
        f.status === 'approved' ? 'ok' : f.status === 'draft' ? 'warn' : 'err'
      return {
        id: f.id,
        filterValue: t(`common:enums.round.${f.round}`),
        search: `${person.full_name} ${person.national_id}`,
        cells: [
          { kind: 'text', text: person.full_name },
          { kind: 'ltr', text: person.national_id },
          { kind: 'text', text: t(`common:enums.round.${f.round}`) },
          { kind: 'text', text: f.contact_date ? formatShortDate(f.contact_date, locale) : '—' },
          { kind: 'text', text: t(`common:enums.mode.${f.contact_mode ?? 'telephone'}`) },
          chip(t(`common:enums.surveyStatus.${f.status}`), tone),
        ],
      } satisfies ListRow
    })
  }, [module, t, locale, s])
}

/* ── counts, used by nav badges and the dashboard ───────────────────────── */

export function useModuleCounts(): Record<ModuleId, number> {
  const s = useSession()
  return useMemo(() => {
    const alive = (m: ModuleId, ids: string[]) =>
      ids.filter((id) => !s.deleted.has(`${m}:${id}`)).length
    return {
      tp: alive('tp', db.PARTNERSHIPS.filter((p) => p.partnership_type === 'training').map((p) => p.id)),
      pp: alive('pp', db.PARTNERSHIPS.filter((p) => p.partnership_type === 'production_support').map((p) => p.id)),
      tc: alive('tc', db.TRAINING_ENROLMENTS.map((e) => e.id)),
      ln: alive('ln', db.LINKAGES.map((l) => l.id)),
      ex: alive('ex', db.EXHIBITIONS.map((e) => e.id)),
      rg: alive('rg', [...db.REGISTRATIONS, ...s.extraRegistrations].map((r) => r.id)),
      fu: alive('fu', db.SURVEYS.map((f) => f.id)),
    }
  }, [s])
}

/* ── exhibitions, for the registration dropdown ─────────────────────────── */

export type ExhibitionOption = {
  id: string
  name: string
  label: string
  disabled: boolean
  reason: 'held' | 'full' | null
  taken: number
  capacity: number
  free: number
  dates: string
  location: string
}

export function useExhibitionOptions(t: Translate, locale: string): ExhibitionOption[] {
  const s = useSession()
  return useMemo(
    () =>
      db.EXHIBITIONS.filter((e) => !s.deleted.has(`ex:${e.id}`)).map((e) => {
        const taken =
          (db.EXHIBITION_TAKEN[e.id] ?? 0) +
          s.extraRegistrations.filter((r) => r.exhibition_id === e.id).length
        const held = exhibitionHasEnded(e)
        const full = exhibitionIsFull(e, taken)
        const dates = formatDateRange(e.start_date, e.end_date, locale)
        const reason = held ? 'held' : full ? 'full' : null
        const suffix = held
          ? t('common:exhibition.alreadyHeld')
          : full
            ? t('common:exhibition.full')
            : t('common:exhibition.boothsFree', { count: e.booth_capacity - taken })
        return {
          id: e.id,
          name: e.name,
          label: `${e.name} · ${dates} · ${suffix}`,
          disabled: held || full,
          reason,
          taken,
          capacity: e.booth_capacity,
          free: Math.max(0, e.booth_capacity - taken),
          dates,
          location: e.location,
        }
      }),
    [t, s, locale],
  )
}

/* ── mutations ──────────────────────────────────────────────────────────── */

export function useMutations() {
  return useMemo(
    () => ({
      remove(module: ModuleId, id: string) {
        session.deleted.add(`${module}:${id}`)
        emit()
      },
      setRegistrationStatus(id: string, status: 'approved' | 'rejected') {
        session.regStatus = { ...session.regStatus, [id]: status }
        emit()
      },
      /** Current status of one registration, session override first. */
      registrationStatus(id: string): db.ExhibitionRegistration['status'] | null {
        const row = [...db.REGISTRATIONS, ...session.extraRegistrations].find(
          (r) => r.id === id,
        )
        if (!row) return null
        return session.regStatus[id] ?? row.status
      },
      addRegistration(exhibitionId: string, productIds: string[], producerTypeId: string) {
        const id = `rg_new_${session.extraRegistrations.length + 1}`
        session.extraRegistrations = [
          ...session.extraRegistrations,
          {
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null,
            deleted_at: null,
            exhibition_id: exhibitionId,
            person_id: db.PORTAL_PERSON_ID,
            producer_type_id: producerTypeId,
            producer_type_other: null,
            is_first_time: false,
            status: 'submitted',
            submitted_by_participant: true,
            reviewed_by: null,
            reviewed_at: null,
            client_uuid: null,
          },
        ]
        session.extraRegProducts = { ...session.extraRegProducts, [id]: productIds }
        emit()
      },
      setManualValue(code: string, value: string) {
        session.manualValues = { ...session.manualValues, [code]: value }
        emit()
      },
    }),
    [],
  )
}

export function useManualValues(): Record<string, string> {
  return useSession().manualValues
}

/* ── participant portal ─────────────────────────────────────────────────── */

export function usePortalPerson() {
  const s = useSession()
  return useMemo(() => {
    const person = db.PEOPLE.find((p) => p.id === db.PORTAL_PERSON_ID)!
    const regs = [...db.REGISTRATIONS, ...s.extraRegistrations].filter(
      (r) => r.person_id === person.id && !s.deleted.has(`rg:${r.id}`),
    )
    return {
      person,
      registrations: regs.map((r) => ({
        id: r.id,
        exhibition: db.EXHIBITIONS.find((e) => e.id === r.exhibition_id)!,
        status: s.regStatus[r.id] ?? r.status,
        productIds: db.REGISTRATION_PRODUCTS[r.id] ?? s.extraRegProducts[r.id] ?? [],
        submittedAt: r.created_at,
      })),
    }
  }, [s])
}

/* ── dashboard ──────────────────────────────────────────────────────────── */

export type IndicatorRow = {
  code: string
  sourceModule: ModuleId | 'both' | null
  target: string
  actual: string
  pct: number
  manual: boolean
}

export type IndicatorGroup = {
  num: string
  accent: 'teal' | 'green' | 'amber' | 'slate' | 'ink'
  indicatorCount: number
  withoutForm: number
  rows: IndicatorRow[]
}

export function useIndicatorGroups(): IndicatorGroup[] {
  const counts = useModuleCounts()
  const s = useSession()

  return useMemo(() => {
    const heldCount = db.EXHIBITIONS.filter(
      (e) => !s.deleted.has(`ex:${e.id}`) && exhibitionHasEnded(e),
    ).length
    const pct = (n: number, d: number) => Math.min(100, (n / d) * 100)

    return [
      {
        num: '01',
        accent: 'teal',
        indicatorCount: 6,
        withoutForm: 2,
        rows: [
          { code: 'A1', sourceModule: 'fu', target: '60%', actual: '58%', pct: 97, manual: false },
          { code: 'A1.2', sourceModule: 'tp', target: '4', actual: String(counts.tp), pct: pct(counts.tp, 4), manual: false },
          { code: 'A1.3', sourceModule: 'tc', target: '120', actual: '47', pct: 39, manual: false },
          { code: 'B1', sourceModule: 'fu', target: '70%', actual: '—', pct: 0, manual: false },
          { code: 'B1.1', sourceModule: null, target: '1', actual: '0', pct: 0, manual: true },
          { code: 'B1.2', sourceModule: null, target: '100', actual: '0', pct: 0, manual: true },
        ],
      },
      {
        num: '02',
        accent: 'green',
        indicatorCount: 6,
        withoutForm: 2,
        rows: [
          { code: 'C1', sourceModule: 'fu', target: '70%', actual: '72%', pct: 100, manual: false },
          { code: 'C1.1', sourceModule: 'pp', target: '3', actual: String(counts.pp), pct: pct(counts.pp, 3), manual: false },
          { code: 'C1.2', sourceModule: 'ln', target: '6', actual: String(counts.ln), pct: pct(counts.ln, 6), manual: false },
          { code: 'C1.3', sourceModule: null, target: '—', actual: '0', pct: 0, manual: true },
          { code: 'D0.1', sourceModule: 'tc', target: '40', actual: '18', pct: 45, manual: false },
          { code: 'D0.2', sourceModule: null, target: '8', actual: '0', pct: 0, manual: true },
        ],
      },
      {
        num: '03',
        accent: 'amber',
        indicatorCount: 3,
        withoutForm: 1,
        rows: [
          { code: 'E0.1', sourceModule: 'ex', target: '12', actual: String(heldCount), pct: pct(heldCount, 12), manual: false },
          { code: 'E0.2', sourceModule: 'rg', target: '150', actual: '62', pct: 41, manual: false },
          { code: 'F0.1', sourceModule: null, target: '12', actual: '0', pct: 0, manual: true },
        ],
      },
      {
        num: '04',
        accent: 'slate',
        indicatorCount: 4,
        withoutForm: 3,
        rows: [
          { code: 'G0.1', sourceModule: null, target: '1', actual: '1', pct: 100, manual: true },
          { code: 'G0.2', sourceModule: null, target: '14', actual: '0', pct: 0, manual: true },
          { code: 'G0.3', sourceModule: null, target: '4', actual: '0', pct: 0, manual: true },
          {
            code: 'G0.4',
            sourceModule: 'both',
            target: '6',
            actual: String(counts.tp + counts.pp),
            pct: pct(counts.tp + counts.pp, 6),
            manual: false,
          },
        ],
      },
      {
        num: '05',
        accent: 'ink',
        indicatorCount: 1,
        withoutForm: 0,
        rows: [
          { code: 'IMP-0', sourceModule: 'fu', target: '70%', actual: '—', pct: 0, manual: false },
        ],
      },
    ]
  }, [counts, s])
}

export type Kpi = {
  id: string
  value: string
  target: string
  pct: number
  deltaCount: number
  tone: 'teal' | 'raised' | 'amber' | 'green'
}

export function useKpis(): Kpi[] {
  const counts = useModuleCounts()
  const s = useSession()
  return useMemo(() => {
    const heldCount = db.EXHIBITIONS.filter(
      (e) => !s.deleted.has(`ex:${e.id}`) && exhibitionHasEnded(e),
    ).length
    const partnerships = counts.tp + counts.pp
    return [
      { id: 'participants', value: '47', target: '120', pct: 39, deltaCount: 6, tone: 'teal' },
      {
        id: 'partnerships',
        value: String(partnerships),
        target: '6',
        pct: Math.min(100, (partnerships / 6) * 100),
        deltaCount: 1,
        tone: 'raised',
      },
      {
        id: 'markets',
        value: String(heldCount),
        target: '12',
        pct: Math.min(100, (heldCount / 12) * 100),
        deltaCount: 2,
        tone: 'amber',
      },
      { id: 'producers', value: '62', target: '150', pct: 41, deltaCount: 14, tone: 'green' },
    ]
  }, [counts, s])
}

/** Disaggregation bars on the dashboard. */
export function useDisaggregation() {
  return useMemo(
    () => [
      { id: 'sex', accent: 'teal' as const, bars: [{ id: 'female', v: 26 }, { id: 'male', v: 21 }] },
      {
        id: 'age',
        accent: 'green' as const,
        bars: [
          { id: 'a18', v: 6 },
          { id: 'a25', v: 16 },
          { id: 'a35', v: 14 },
          { id: 'a45', v: 11 },
        ],
      },
    ],
    [],
  )
}

/** Indicators with no form behind them, shown as the dashboard "gap" panel. */
export function useGapCodes(): string[] {
  return useMemo(() => db.MANUAL_INDICATORS.map((m) => m.code), [])
}

export function useManualIndicators() {
  return db.MANUAL_INDICATORS
}

/* ── record detail ──────────────────────────────────────────────────────── */

export type DetailField = { labelKey: string; value: string; ltr?: boolean }
export type DetailRecord = {
  id: string
  title: string
  subtitle: string
  status: { text: string; tone: ChipKind } | null
  fields: DetailField[]
  by: string
  at: string
} | null

export function useDetail(module: ModuleId, id: string, t: Translate, locale: string): DetailRecord {
  const s = useSession()
  return useMemo(() => {
    const refT = (rows: db.RefRow[], rid: string | null) =>
      refLabel(rows.find((r) => r.id === rid), locale)

    if (module === 'tp' || module === 'pp') {
      const ps = db.PARTNERSHIPS.find((x) => x.id === id)
      if (!ps) return null
      const partner = db.PARTNERS.find((p) => p.id === ps.partner_id)!
      const meta = db.PARTNER_META[partner.id] ?? { by: '', at: '' }
      const training = module === 'tp'
      return {
        id,
        title: partner.name,
        subtitle: partner.unit ?? '',
        status: chipFrom(t('common:chips.active'), 'ok'),
        fields: [
          { labelKey: 'detail.partnerType', value: refT(training ? db.REF_PARTNER_TYPE_TRAINING : db.REF_PARTNER_TYPE_PRODUCTION, ps.partner_type_id) },
          { labelKey: 'detail.roles', value: (db.PARTNERSHIP_ROLES[ps.id] ?? []).map((r) => refT(training ? db.REF_PARTNER_ROLE_TRAINING : db.REF_PARTNER_ROLE_PRODUCTION, r)).join(', ') },
          { labelKey: 'detail.contact', value: partner.contact_person ?? '' },
          { labelKey: 'detail.phone', value: partner.phone ?? '', ltr: true },
          { labelKey: 'detail.email', value: partner.email ?? '', ltr: true },
        ],
        by: meta.by,
        at: meta.at,
      }
    }

    if (module === 'tc') {
      const e = db.TRAINING_ENROLMENTS.find((x) => x.id === id)
      if (!e) return null
      const person = db.PEOPLE.find((p) => p.id === e.person_id)!
      const sess = db.TRAINING_SESSIONS.find((x) => x.id === e.session_id)!
      const meta = db.ENROLMENT_META[e.id] ?? { by: '', at: '' }
      return {
        id,
        title: person.full_name,
        subtitle: person.national_id,
        status: e.met_criteria
          ? chipFrom(t('forms:detail.criteriaMet'), 'ok')
          : chipFrom(t('forms:detail.criteriaNotMet'), 'err'),
        fields: [
          { labelKey: 'detail.nationalId', value: person.national_id, ltr: true },
          { labelKey: 'detail.sex', value: t(`common:enums.sex.${person.sex ?? 'unknown'}`) },
          { labelKey: 'detail.age', value: person.age_recorded == null ? '' : String(person.age_recorded) },
          { labelKey: 'detail.phone', value: person.phone ?? '', ltr: true },
          { labelKey: 'detail.training', value: refT(db.REF_TRAINING_TOPIC, sess.topic_id) },
          { labelKey: 'detail.trainingDate', value: formatShortDate(sess.start_date, locale) },
          { labelKey: 'detail.involvement', value: refT(db.REF_AGRI_INVOLVEMENT, person.agri_involvement_id) },
          { labelKey: 'detail.activityTypes', value: (db.PERSON_ACTIVITY[person.id] ?? []).map((a) => refT(db.REF_ACTIVITY_TYPE, a)).join(', ') },
        ],
        by: meta.by,
        at: meta.at,
      }
    }

    if (module === 'ln') {
      const l = db.LINKAGES.find((x) => x.id === id)
      if (!l) return null
      const personId = db.INITIATIVE_PERSON[l.initiative_id]!
      const person = db.PEOPLE.find((p) => p.id === personId)!
      const ps = db.PARTNERSHIPS.find((x) => x.id === l.partnership_id)!
      const partner = db.PARTNERS.find((p) => p.id === ps.partner_id)!
      const meta = db.LINKAGE_META[l.id] ?? { by: '', at: '' }
      return {
        id,
        title: person.full_name,
        subtitle: person.national_id,
        status: chipFrom(t(`common:enums.linkStatus.${l.status}`), l.status === 'active' ? 'ok' : 'warn'),
        fields: [
          { labelKey: 'detail.partner', value: partner.name },
          { labelKey: 'detail.scope', value: l.scope },
          { labelKey: 'detail.request', value: l.request ?? '' },
          { labelKey: 'detail.created', value: l.linked_on },
        ],
        by: meta.by,
        at: meta.at,
      }
    }

    if (module === 'ex') {
      const e = db.EXHIBITIONS.find((x) => x.id === id)
      if (!e) return null
      const meta = db.EXHIBITION_META[e.id] ?? { by: '', at: '' }
      const held = exhibitionHasEnded(e)
      return {
        id,
        title: e.name,
        subtitle: e.location,
        status: held ? chipFrom(t('common:chips.held'), 'mute') : chipFrom(t('common:chips.upcoming'), 'warn'),
        fields: [
          { labelKey: 'detail.dates', value: formatDateRange(e.start_date, e.end_date, locale) },
          { labelKey: 'detail.location', value: e.location },
          { labelKey: 'detail.capacity', value: t('common:units.booths', { count: e.booth_capacity }) },
          { labelKey: 'detail.taken', value: String(db.EXHIBITION_TAKEN[e.id] ?? 0) },
          { labelKey: 'detail.sponsor', value: e.external_sponsor ?? '' },
        ],
        by: meta.by,
        at: meta.at,
      }
    }

    if (module === 'rg') {
      const all = [...db.REGISTRATIONS, ...s.extraRegistrations]
      const r = all.find((x) => x.id === id)
      if (!r) return null
      const person = personById(r.person_id)!
      const ex = db.EXHIBITIONS.find((e) => e.id === r.exhibition_id)!
      const status = s.regStatus[r.id] ?? r.status
      const meta = db.REGISTRATION_META[r.id] ?? { by: t('forms:detail.producerPortal'), at: r.created_at }
      const tone: ChipKind = status === 'approved' ? 'ok' : status === 'rejected' ? 'err' : 'pending'
      return {
        id,
        title: person.full_name,
        subtitle: person.national_id,
        status: chipFrom(t(`common:chips.status.${status}`), tone),
        fields: [
          { labelKey: 'detail.nationalId', value: person.national_id, ltr: true },
          { labelKey: 'detail.phone', value: person.phone ?? '', ltr: true },
          { labelKey: 'detail.exhibition', value: ex.name },
          { labelKey: 'detail.products', value: (db.REGISTRATION_PRODUCTS[r.id] ?? s.extraRegProducts[r.id] ?? []).map((p) => refT(db.REF_PRODUCT, p)).join(', ') },
          { labelKey: 'detail.producerType', value: refT(db.REF_PRODUCER_TYPE, r.producer_type_id) },
          { labelKey: 'detail.firstTime', value: r.is_first_time ? t('common:yes') : t('common:no') },
        ],
        by: meta.by,
        at: meta.at,
      }
    }

    const f = db.SURVEYS.find((x) => x.id === id)
    if (!f) return null
    const person = db.PEOPLE.find((p) => p.id === f.person_id)!
    const meta = db.SURVEY_META[f.id] ?? { by: '', at: '' }
    const tone: ChipKind = f.status === 'approved' ? 'ok' : f.status === 'draft' ? 'warn' : 'err'
    return {
      id,
      title: person.full_name,
      subtitle: person.national_id,
      status: chipFrom(t(`common:enums.surveyStatus.${f.status}`), tone),
      fields: [
        { labelKey: 'detail.nationalId', value: person.national_id, ltr: true },
        { labelKey: 'detail.round', value: t(`common:enums.round.${f.round}`) },
        { labelKey: 'detail.contactDate', value: f.contact_date ?? '—' },
        { labelKey: 'detail.mode', value: t(`common:enums.mode.${f.contact_mode ?? 'telephone'}`) },
        { labelKey: 'detail.enumerator', value: f.enumerator_name ?? '' },
      ],
      by: meta.by,
      at: meta.at,
    }
  }, [module, id, t, locale, s])
}

function chipFrom(text: string, tone: ChipKind) {
  return { text, tone }
}

/** People who can be followed up / linked -- those with a completion record. */
export function useCompletionPeople() {
  return useMemo(
    () =>
      db.TRAINING_ENROLMENTS.map((e) => {
        const person = db.PEOPLE.find((p) => p.id === e.person_id)!
        const sess = db.TRAINING_SESSIONS.find((x) => x.id === e.session_id)!
        return {
          personId: person.id,
          nationalId: person.national_id,
          name: person.full_name,
          phone: person.phone ?? '',
          topicId: sess.topic_id,
          date: sess.start_date,
          metCriteria: e.met_criteria === true,
        }
      }),
    [],
  )
}

export function useSupportOnRecord(personId: string | null): string[] {
  return useMemo(() => {
    if (!personId) return []
    const out: string[] = []
    if (db.TRAINING_ENROLMENTS.some((e) => e.person_id === personId)) out.push('training')
    if (Object.entries(db.INITIATIVE_PERSON).some(([, p]) => p === personId)) out.push('linkage')
    if (db.REGISTRATIONS.some((r) => r.person_id === personId)) out.push('exhibition')
    return out
  }, [personId])
}

export function usePartnerOptions(type: 'training' | 'production_support') {
  return useMemo(
    () =>
      db.PARTNERSHIPS.filter((p) => p.partnership_type === type).map((ps) => ({
        id: ps.id,
        name: db.PARTNERS.find((p) => p.id === ps.partner_id)!.name,
      })),
    [type],
  )
}

/* ── edit prefill ───────────────────────────────────────────────────────────
   Loads an existing record back into form values. The prototype did this in
   `editVals`; without it "Edit record" would open a blank form and silently
   discard everything not retyped. Keys match the FieldSpec keys in
   useFormSchema. Phase 4 replaces the lookups, not the shape.                */

export function useEditValues(
  module: ModuleId,
  id: string | undefined,
): Record<string, string | string[] | undefined> | null {
  const s = useSession()
  return useMemo(() => {
    if (!id) return null

    if (module === 'tp' || module === 'pp') {
      const ps = db.PARTNERSHIPS.find((x) => x.id === id)
      if (!ps) return null
      const partner = db.PARTNERS.find((p) => p.id === ps.partner_id)
      if (!partner) return null
      return {
        name: partner.name,
        contact: partner.contact_person ?? '',
        phone: partner.phone ?? '',
        email: partner.email ?? '',
        type: ps.partner_type_id,
        role: db.PARTNERSHIP_ROLES[ps.id] ?? [],
      }
    }

    if (module === 'tc') {
      const e = db.TRAINING_ENROLMENTS.find((x) => x.id === id)
      if (!e) return null
      const person = db.PEOPLE.find((p) => p.id === e.person_id)
      const sess = db.TRAINING_SESSIONS.find((x) => x.id === e.session_id)
      if (!person || !sess) return null
      return {
        nid: person.national_id,
        nid2: person.national_id,
        name: person.full_name,
        sex: person.sex ?? '',
        age: person.age_recorded == null ? '' : String(person.age_recorded),
        phone: person.phone ?? '',
        topic: sess.topic_id,
        date: sess.start_date,
        involve: person.agri_involvement_id ?? '',
        act: db.PERSON_ACTIVITY[person.id] ?? [],
        met: e.met_criteria ? 'yes' : 'no',
      }
    }

    if (module === 'ln') {
      const l = db.LINKAGES.find((x) => x.id === id)
      if (!l) return null
      return {
        farmer: db.INITIATIVE_PERSON[l.initiative_id] ?? '',
        partner: l.partnership_id,
        scope: l.scope,
        request: l.request ?? '',
      }
    }

    if (module === 'ex') {
      const e = db.EXHIBITIONS.find((x) => x.id === id)
      if (!e) return null
      return {
        name: e.name,
        start: e.start_date,
        end: e.end_date,
        location: e.location,
        capacity: String(e.booth_capacity),
        sponsor: e.external_sponsor ?? '',
      }
    }

    if (module === 'rg') {
      const r = [...db.REGISTRATIONS, ...s.extraRegistrations].find((x) => x.id === id)
      if (!r) return null
      const person = personById(r.person_id)
      if (!person) return null
      return {
        exhibition: r.exhibition_id,
        nid: person.national_id,
        nid2: person.national_id,
        name: person.full_name,
        phone: person.phone ?? '',
        products: db.REGISTRATION_PRODUCTS[r.id] ?? s.extraRegProducts[r.id] ?? [],
        producerType: r.producer_type_id,
        firstTime: r.is_first_time ? 'yes' : 'no',
      }
    }

    const f = db.SURVEYS.find((x) => x.id === id)
    if (!f) return null
    return {
      person: f.person_id,
      respondent: f.respondent,
      round: f.round,
      contactDate: f.contact_date ?? '',
      mode: f.contact_mode ?? 'telephone',
      enumerator: f.enumerator_name ?? '',
    }
  }, [module, id, s])
}

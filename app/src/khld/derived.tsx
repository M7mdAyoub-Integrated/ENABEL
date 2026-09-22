import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { toAppError } from '../data/errors'
import { refLabel, type RefRow } from '../data/refTables'
import {
  useKhldAttendanceFigures, useKhldList, useKhldMilestoneStatus, useKhldRecord, useVolunteerParticipations,
  type KhldPerson, type KhldRecord, type MilestoneStatus,
} from '../data/khld'
import { formatShortDate } from '../lib/format'
import type { KhldFieldDef } from './types'
import { SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The read-only fields: what the database assigns or works out, or what a
 *  linked record already says.
 *
 *  One place, used by the form screen and the detail screen, so a derived
 *  field cannot read one way while being entered and another way once saved
 *  (the E0.3 modules lesson, see DERIVED_LISTS in ../rmth/RmthFormScreen).
 *
 *  Nothing here decides whether a record COUNTS. The two figures a screen
 *  shows beside a record -- a milestone's status and an attendance sheet's
 *  reconciliation -- are answered by khld_milestone_status and
 *  khld_attendance_figures (0147), the same functions the views read from.
 *  The one thing worked out on screen is SO3-0's tally of the log it shows
 *  (participations inside the period reviewed), labelled as that tally.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The lists a derived field renders through, keyed by the derivation, loaded with the form's own. */
export const DERIVED_LISTS: Readonly<Record<string, readonly string[]>> = {
  partner_type: ['partner_type'],
  volunteer_sex: ['sex'],
  volunteer_age_group: ['age_group'],
  volunteer_nationality: ['nationality'],
  volunteer_disability: ['disability'],
  volunteer_affiliation: ['f2_affiliation'],
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>

/** The person's age band by the database's own bands (khld_age_band, 0139), never a copy of them here. */
function useAgeBand(age: number | null) {
  return useQuery({
    queryKey: ['khld', 'age_band', age],
    enabled: age != null,
    staleTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await (supabase as unknown as { rpc: Rpc }).rpc('khld_age_band', { p_age: age })
      if (error) throw toAppError(error)
      return String(data)
    },
  })
}

export function ageOf(p: KhldPerson | null | undefined): number | null {
  if (!p) return null
  if (p.date_of_birth) {
    const dob = new Date(p.date_of_birth)
    const now = new Date()
    let a = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a -= 1
    return a
  }
  return p.age_recorded
}

/** A volunteer / vendor of a person, for the "registered before?" derivations. */
function useEntityOfPerson(table: 'khld_volunteer' | 'khld_vendor', personId: string | undefined) {
  return useKhldList(table, personId ? { person_id: personId } : { id: '00000000-0000-0000-0000-000000000000' })
}

export type DerivedText = { text?: string; note?: string; tone?: 'ok' | 'warn' | 'mute' }

/**
 * The text of a derived field.
 *
 * `values` are the form's current answers (edit or new), `record` the saved
 * one (edit or detail), `personId` the person the form has resolved so far.
 * Hooks are called unconditionally so the same component serves every field.
 */
export function useDerived(
  f: KhldFieldDef,
  opts: {
    record: KhldRecord | undefined
    values: Record<string, string>
    mode: 'new' | 'edit' | 'detail'
    refs: Record<string, RefRow[]>
    personId?: string | undefined
    person?: KhldPerson | null | undefined
    /** Whether the record picker for the enterprise chose an existing row. */
    enterpriseId?: string | undefined
    /** What "registered before?" is asked about: the person (SO3-F2) or the enterprise (SO4-G2). */
    duplicateOf?: 'person' | 'enterprise' | undefined
    /** The identifier is complete and the lookup found nobody: the person will be created by the save. */
    personNew?: boolean | undefined
  },
): DerivedText {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const d = f.derived ?? ''
  const row = opts.record?.row
  const v = (col: string) => opts.values[col] || (typeof row?.[col] === 'string' ? (row[col] as string) : '')
  const notSet = t('detail.notSet')
  const onSave = opts.mode === 'new' ? t('form.derivedOnSave') : undefined

  const partnerId = v('partner_id')
  const partner = useKhldRecord('khld_partner', d === 'partner_type' && partnerId ? partnerId : undefined)
  const activityId = v('activity_id')
  const activity = useKhldRecord('khld_activity', d === 'activity_title' && activityId ? activityId : undefined)
  const volunteerId = v('volunteer_id')
  const wantsVolunteer = d.startsWith('volunteer_') || d === 'activities_count' || d === 'hours_total'
  const volunteer = useKhldRecord('khld_volunteer', wantsVolunteer && volunteerId ? volunteerId : undefined)
  const vendorId = v('vendor_id')
  const vendor = useKhldRecord('khld_vendor', d === 'vendor_name' && vendorId ? vendorId : undefined)
  const enterpriseId = opts.enterpriseId ?? v('enterprise_id')
  const enterprise = useKhldRecord('khld_enterprise', (d === 'enterprise_owner' || d === 'duplicate_check') && enterpriseId ? enterpriseId : undefined)
  const milestone = useKhldMilestoneStatus(d === 'overall_status' && row ? row.id : undefined)
  const figures = useKhldAttendanceFigures(d === 'reconciliation' && row ? row.id : undefined)
  const log = useVolunteerParticipations((d === 'activities_count' || d === 'hours_total') && volunteerId ? volunteerId : undefined)
  const personForBand = d === 'volunteer_age_group' ? volunteer.data?.person : null
  const band = useAgeBand(ageOf(personForBand))
  const personId = opts.personId ?? opts.person?.id
  const volunteersOf = useEntityOfPerson('khld_volunteer', d === 'duplicate_check' && opts.duplicateOf === 'person' ? personId : undefined)
  const vendorsOf = useEntityOfPerson('khld_vendor', d === 'returning_vendor' ? personId : undefined)
  const priorRegs = useKhldList('khld_vendor_registration', d === 'returning_vendor' && vendorsOf.data?.[0] ? { vendor_id: vendorsOf.data[0].id } : { id: '00000000-0000-0000-0000-000000000000' })

  const ref = (list: string, id: unknown, other?: unknown) => {
    const r = (opts.refs[list] ?? []).find((x) => x.id === id)
    if (!r) return undefined
    const base = refLabel(r, locale)
    return r.allows_free_text && typeof other === 'string' && other ? `${base}: ${other}` : base
  }
  const yesNo = (b: boolean) => (b ? t('form.yes') : t('form.no'))

  switch (d) {
    case 'reference':
      return row && typeof row['reference'] === 'string' ? { text: row['reference'] as string } : { note: t('form.assignedOnSave') }
    case 'vendor_reference':
      return opts.record?.vendor?.reference ? { text: opts.record.vendor.reference } : { note: t('form.assignedOnSave') }
    case 'updated_at':
      return row ? { text: formatShortDate(row.updated_at, locale) } : { note: t('form.assignedOnSave') }
    case 'partner_type': {
      const p = partner.data?.row
      if (!partnerId) return { note: onSave ?? notSet }
      return { text: ref('partner_type', p?.['partner_type_id'], p?.['partner_type_other']) ?? notSet }
    }
    case 'activity_title': {
      const a = activity.data?.row
      if (!activityId) return { note: notSet }
      if (!a) return { text: '…' }
      const title = typeof a['event_title'] === 'string' ? (a['event_title'] as string) : ''
      const date = typeof a['event_date'] === 'string' ? formatShortDate(a['event_date'] as string, locale) : ''
      return { text: [title, date].filter(Boolean).join(` ${SEP} `) }
    }
    case 'volunteer_name': return { text: volunteer.data?.person?.full_name ?? (volunteerId ? '…' : notSet) }
    case 'volunteer_sex': {
      const s = volunteer.data?.person?.sex
      return { text: s ? ref('sex', (opts.refs['sex'] ?? []).find((x) => x.code === s)?.id) ?? s : notSet }
    }
    case 'volunteer_age_group': {
      const age = ageOf(volunteer.data?.person)
      if (age == null) return { text: notSet }
      const code = band.data
      const label = code ? ref('age_group', (opts.refs['age_group'] ?? []).find((x) => x.code === code)?.id) : undefined
      return { text: label ?? '…', note: String(age) }
    }
    case 'volunteer_nationality': return { text: ref('nationality', volunteer.data?.row['nationality_id']) ?? notSet }
    case 'volunteer_disability': return { text: ref('disability', volunteer.data?.row['disability_id']) ?? notSet }
    case 'volunteer_affiliation': return { text: ref('f2_affiliation', volunteer.data?.row['affiliation_id'], volunteer.data?.row['affiliation_other']) ?? notSet }
    case 'volunteer_reg_date': {
      const r = volunteer.data?.row['reg_date']
      return { text: typeof r === 'string' ? formatShortDate(r, locale) : notSet }
    }
    case 'activities_count':
    case 'hours_total': {
      if (!volunteerId) return { note: t('form.log.chooseVolunteer') }
      const from = v('period_from'); const to = v('period_to')
      const rows = (log.data ?? []).filter((p) => p.verified && (!from || p.participated_on >= from) && (!to || p.participated_on <= to))
      if (d === 'activities_count') return { text: String(rows.length), note: t('form.log.inPeriod') }
      return { text: String(rows.reduce((s, p) => s + (p.hours ?? 0), 0)), note: t('form.log.inPeriod') }
    }
    case 'vendor_name': return { text: vendor.data?.person?.full_name ?? (vendorId ? '…' : notSet) }
    case 'enterprise_owner': {
      const e = enterprise.data
      if (!enterpriseId) return { text: notSet }
      if (!e) return { text: '…' }
      const name = e.person?.full_name ?? e.row['owner_name']
      const phone = e.person?.phone ?? e.row['owner_phone']
      return { text: [name, phone].filter((x) => typeof x === 'string' && x).join(` ${SEP} `) || notSet }
    }
    case 'duplicate_check': {
      // SO3-F2: is this person already a registered volunteer? SO4-G2: is
      // this enterprise already in the register? Answered from the register
      // itself, not from a box the enumerator ticks.
      if (opts.duplicateOf === 'person') {
        if (!personId) return opts.personNew ? { text: yesNo(false), tone: 'ok' } : { note: onSave ?? notSet }
        const others = (volunteersOf.data ?? []).filter((r) => r.id !== opts.record?.row.id)
        return others.length
          ? { text: `${yesNo(true)} ${SEP} ${String(others[0]!['reference'] ?? '')}`, tone: 'warn' }
          : { text: yesNo(false), tone: 'ok' }
      }
      if (enterpriseId) return { text: `${yesNo(true)} ${SEP} ${enterprise.data?.row['reference'] ?? '…'}`, tone: 'warn' }
      return opts.mode === 'new' ? { note: t('form.enterprise.fromOwner') } : { text: yesNo(false), tone: 'ok' }
    }
    case 'returning_vendor': {
      if (!personId && !opts.record) return { note: onSave ?? notSet }
      const others = (priorRegs.data ?? []).filter((r) => r.id !== opts.record?.row.id)
      return others.length ? { text: yesNo(true), tone: 'warn' } : { text: yesNo(false), tone: 'ok' }
    }
    case 'sessions_attended_count':
      return row && row['sessions_attended_count'] != null ? { text: t('detail.sessionsOf', { count: Number(row['sessions_attended_count']) }) } : { note: onSave ?? notSet }
    case 'completion':
      return row && row['completion'] != null
        ? { text: t(row['completion'] ? 'detail.completion.true' : 'detail.completion.false'), tone: row['completion'] ? 'ok' : 'mute' }
        : { note: onSave ?? notSet }
    case 'support_types_count':
      return row && row['support_types_count'] != null ? { text: String(row['support_types_count']) } : { note: onSave ?? notSet }
    case 'overall_status': return milestoneText(milestone.data, (k, v) => t(k, v ?? {}), opts.mode)
    case 'reconciliation': {
      if (!row) return { note: onSave ?? notSet }
      const g = figures.data
      if (!g) return { text: '…' }
      return { text: g.agrees ? t('detail.attendance.agrees') : t('detail.attendance.disagrees'), tone: g.agrees ? 'ok' : 'warn' }
    }
    default:
      return { note: onSave ?? notSet }
  }
}

export function milestoneText(s: MilestoneStatus | undefined, t: (k: string, v?: Record<string, unknown>) => string, mode: 'new' | 'edit' | 'detail'): DerivedText {
  if (mode === 'new') return { note: t('form.derivedOnSave') }
  if (!s) return { text: '…' }
  if (s.status === 'not_computable') {
    const note =
      s.reason === 'rule_not_evaluable' ? t('detail.milestone.reason_rule_not_evaluable', { broken: s.broken ?? '' })
      : s.reason === 'items_missing' ? t('detail.milestone.reason_items_missing', { missing: (s.missing ?? []).join(', ') })
      : t('detail.milestone.reason_no_rule')
    return { text: t('detail.milestone.not_computable'), note, tone: 'warn' }
  }
  return {
    text: t(`detail.milestone.${s.status}`),
    note: t('detail.milestone.tally', { in_place: s.in_place ?? 0, partly: s.partly ?? 0, not_in_place: s.not_in_place ?? 0, n: (s.critical_items ?? []).length }),
    tone: s.status === 'established' ? 'ok' : 'mute',
  }
}

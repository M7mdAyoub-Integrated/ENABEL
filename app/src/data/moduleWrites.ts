import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import type { FormValues } from '../forms/useFormSchema'
import { useEditValues } from '../hooks/useData'
import { refLabel, useRef } from './refTables'
import { toAppError } from './errors'
import { usePartner, useSavePartner, type SavePartnerInput } from './partnerships'
import {
  useExhibition,
  useCreateExhibition,
  useUpdateExhibition,
  type ExhibitionInput,
} from './exhibitions'
import {
  useCompletion,
  useCreateCompletion,
  useUpdateCompletion,
  type CompletionInput,
  NEW_SESSION,
} from './completions'
import {
  useOfficeService,
  useCreateOfficeService,
  useUpdateOfficeService,
  type OfficeServiceInput,
} from './officeServices'
import {
  useGuidanceRecord,
  useCreateGuidanceRecord,
  useUpdateGuidanceRecord,
  type GuidanceInput,
} from './guidance'

/**
 * The form half of the migration seam.
 *
 * Gives `FormScreen` one shape regardless of whether a module is live yet:
 *   `initialValues`  what to load into an edit form
 *   `save`           what to call on submit, or null while still on mocks
 *
 * As with the other two seam files, every branch's hooks run unconditionally.
 */
export type ModuleWrite = {
  initialValues: FormValues | null
  isLoadingInitial: boolean
  save: ((values: FormValues) => Promise<unknown>) | null
  isSaving: boolean
  error: unknown
  reset: () => void
  isLive: boolean
}

const IDLE: ModuleWrite = {
  initialValues: null,
  isLoadingInitial: false,
  save: null,
  isSaving: false,
  error: null,
  reset: () => undefined,
  isLive: false,
}

/** Pull the string / array out of a FormValues bag. */
function str(v: FormValues, k: string): string {
  return typeof v[k] === 'string' ? (v[k] as string) : ''
}
function arr(v: FormValues, k: string): string[] {
  return Array.isArray(v[k]) ? (v[k] as string[]) : []
}

/**
 * Partners (pn) — the merged module 1.
 *
 * `:id` here is a PARTNER, not a partnership, so editing opens the organisation
 * and ONE of its partnerships — whichever type the form is showing. Switching
 * the type field on an existing organisation and saving is how a second
 * agreement gets added, and `useSavePartner` reuses the partner row rather than
 * writing a second one. That is the whole point of the merge: G0.4 counts
 * distinct partners, so a split organisation reads one too high.
 *
 * The type defaults to the first partnership the organisation holds, so opening
 * an existing partner shows what it already has rather than an empty choice.
 */
function usePartnerWrite(id: string | undefined, enabled: boolean): ModuleWrite {
  const existing = usePartner(enabled && id ? id : undefined, enabled)
  const save = useSavePartner()

  const initialValues = useMemo((): FormValues | null => {
    const p = existing.data
    if (!p) return null
    const first = p.partnerships[0]
    return {
      name: p.name,
      unit: p.unit ?? '',
      contact: p.contactPerson ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      ptype: first?.type ?? '',
      established: first?.establishedOn ?? '',
      type: first?.partnerTypeId ?? '',
      typeOther: first?.partnerTypeOther ?? '',
      role: first?.roleIds ?? [],
    }
  }, [existing.data])

  const write = async (v: FormValues) => {
    const ptype = str(v, 'ptype')
    if (ptype !== 'training' && ptype !== 'production_support') {
      // The form marks this required, so reaching here means the guard above it
      // was bypassed. Refuse rather than defaulting: a partnership silently
      // filed under the wrong type moves A1.2 or C1.1 and nothing says so.
      throw toAppError({ code: '23514', message: 'partnership type is required' })
    }
    // The date is now a field on the form (see useFormSchema). It used to be
    // `new Date()` here, which chose the quarter A1.2 and C1.1 counted the
    // partnership in without anyone seeing or confirming a date.
    //
    // Refuse rather than falling back to today: the form marks it required, so
    // reaching here empty means that guard was bypassed, and quietly
    // substituting today would restore exactly the defect this replaced.
    const established = str(v, 'established')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(established)) {
      throw toAppError({ code: '23502', message: 'established_on is required' })
    }
    const input: SavePartnerInput = {
      name: str(v, 'name'),
      unit: str(v, 'unit') || null,
      contactPerson: str(v, 'contact') || null,
      phone: str(v, 'phone') || null,
      email: str(v, 'email') || null,
      partnerTypeId: str(v, 'type'),
      partnerTypeOther: str(v, 'typeOther') || null,
      roleIds: arr(v, 'role'),
      roleOther: {},
      partnershipType: ptype,
      establishedOn: established,
    }
    const res = await save.mutateAsync({ ...(id ? { partnerId: id } : {}), input })
    return res.partnerId
  }

  return {
    initialValues,
    isLoadingInitial: existing.isLoading,
    save: write,
    isSaving: save.isPending,
    error: save.error,
    reset: () => save.reset(),
    isLive: true,
  }
}

/**
 * Exhibitions — module 2.
 *
 * There is no duration column and the form has no duration field: the value is
 * always derivable from the two dates, and storing it would create a second
 * source for the same fact. The list and detail screens compute it for display
 * with `durationDays()`.
 */
function useExhibitionWrite(id: string | undefined, enabled: boolean): ModuleWrite {
  const existing = useExhibition(enabled && id ? id : undefined)
  const create = useCreateExhibition()
  const update = useUpdateExhibition()

  const initialValues = useMemo((): FormValues | null => {
    const e = existing.data
    if (!e) return null
    return {
      name: e.name,
      start: e.startDate,
      end: e.endDate,
      location: e.location,
      capacity: String(e.boothCapacity),
      sponsor: e.externalSponsor ?? '',
      // Read back so an edit does not write emptiness over them.
      description: e.description ?? '',
      focal: e.focalPoint ?? '',
      opensOn: e.applicationOpensOn ?? '',
      closesOn: e.applicationClosesOn ?? '',
    }
  }, [existing.data])

  const toInput = (v: FormValues): ExhibitionInput => ({
    name: str(v, 'name'),
    startDate: str(v, 'start'),
    endDate: str(v, 'end'),
    location: str(v, 'location'),
    // Empty stays 0, which the check constraint rejects with a readable
    // message rather than silently writing a bad row.
    boothCapacity: Number(str(v, 'capacity') || '0'),
    externalSponsor: str(v, 'sponsor') || null,
    description: str(v, 'description') || null,
    focalPoint: str(v, 'focal') || null,
    applicationOpensOn: str(v, 'opensOn') || null,
    applicationClosesOn: str(v, 'closesOn') || null,
  })

  const save = async (v: FormValues) => {
    if (id && existing.data) return update.mutateAsync({ id, input: toInput(v) })
    return create.mutateAsync(toInput(v))
  }

  return {
    initialValues,
    isLoadingInitial: existing.isLoading,
    save,
    isSaving: create.isPending || update.isPending,
    error: create.error ?? update.error,
    reset: () => {
      create.reset()
      update.reset()
    },
    isLive: true,
  }
}

/**
 * Training completion — module 3.
 *
 * `met` on the form is a three-state answer: yes, no, or unanswered. It maps
 * straight through, because `met_criteria` is nullable and "not yet decided" is
 * a real state that A1.3 must not count either way.
 */
function useCompletionWrite(
  id: string | undefined,
  enabled: boolean,
  locale: string,
): ModuleWrite {
  const existing = useCompletion(enabled && id ? id : undefined)
  const create = useCreateCompletion()
  const update = useUpdateCompletion()
  const topics = useRef('training_topic')

  const initialValues = useMemo((): FormValues | null => {
    const c = existing.data
    if (!c) return null
    return {
      nid: c.nationalId,
      nid2: c.nationalId,
      name: c.fullName,
      sex: c.sex ?? '',
      dob: c.dateOfBirth ?? '',
      age: c.ageRecorded == null ? '' : String(c.ageRecorded),
      phone: c.phone ?? '',
      topic: c.topicId,
      date: c.startDate,
      met: c.metCriteria === null ? '' : c.metCriteria ? 'yes' : 'no',
    }
  }, [existing.data])

  const toInput = (v: FormValues): CompletionInput => {
    const ageText = str(v, 'age')
    return {
      nationalId: str(v, 'nid'),
      fullName: str(v, 'name'),
      sex: str(v, 'sex') || null,
      // Left blank stays null, and `age_or_dob` refuses the insert with a
      // readable message rather than writing a person nobody can age-band.
      age: ageText ? Number(ageText) : null,
      // OQ-22: a person with an age and no date of birth can never be found by
      // the public lookup afterwards, so this is asked for wherever the
      // participant knows it. Blank stays null and age carries the row.
      dateOfBirth: str(v, 'dob') || null,
      phone: str(v, 'phone') || null,
      topicId: str(v, 'topic'),
      topicLabel: refLabel(
        topics.find((r) => r.id === str(v, 'topic')),
        locale,
      ),
      trainingDate: str(v, 'date'),
      // null means "none of these -- create one", chosen explicitly from the
      // picker. Never an omission.
      sessionId: str(v, 'session') === NEW_SESSION ? null : str(v, 'session') || null,
      metCriteria: str(v, 'met') === 'yes' ? true : str(v, 'met') === 'no' ? false : null,
    }
  }

  const save = async (v: FormValues) => {
    if (id && existing.data) {
      return update.mutateAsync({ id, personId: existing.data.personId, input: toInput(v) })
    }
    return create.mutateAsync(toInput(v))
  }

  return {
    initialValues,
    isLoadingInitial: existing.isLoading,
    save,
    isSaving: create.isPending || update.isPending,
    error: create.error ?? update.error,
    reset: () => {
      create.reset()
      update.reset()
    },
    isLive: true,
  }
}

/**
 * Coordination office — module 8.
 *
 * The person fields are only sent on CREATE. On edit `useUpdateOfficeService`
 * ignores them and never rewrites person_id: moving a visit to a different
 * person would move B1.2 for two people at once, and could drop one of them
 * out of a quarter entirely if it was their first visit.
 *
 * So the national ID is shown on the edit form and is not a way to reassign
 * the record. Correcting the wrong person is delete-and-re-enter, deliberately.
 */
function useOfficeWrite(id: string | undefined, enabled: boolean): ModuleWrite {
  const existing = useOfficeService(enabled && id ? id : undefined, enabled)
  const create = useCreateOfficeService()
  const update = useUpdateOfficeService()

  const initialValues = useMemo((): FormValues | null => {
    const o = existing.data
    if (!o) return null
    return {
      nid: o.nationalId,
      nid2: o.nationalId,
      name: o.fullName,
      sex: o.sex ?? '',
      phone: o.phone ?? '',
      svcType: o.serviceTypeId,
      date: o.serviceDate,
      adviser: o.adviser ?? '',
      notes: o.notes ?? '',
    }
  }, [existing.data])

  const toInput = (v: FormValues): OfficeServiceInput => {
    const ageText = str(v, 'age')
    return {
      nationalId: str(v, 'nid'),
      fullName: str(v, 'name'),
      sex: str(v, 'sex') || null,
      age: ageText ? Number(ageText) : null,
      // OQ-22: a person with an age and no date of birth can never be found by
      // the public lookup afterwards, so this is asked for wherever the
      // participant knows it. Blank stays null and age carries the row.
      dateOfBirth: str(v, 'dob') || null,
      phone: str(v, 'phone') || null,
      serviceTypeId: str(v, 'svcType'),
      serviceDate: str(v, 'date'),
      adviser: str(v, 'adviser') || null,
      notes: str(v, 'notes') || null,
    }
  }

  const save = async (v: FormValues) => {
    const input = toInput(v)
    if (id && existing.data) {
      return update.mutateAsync({
        id,
        input: {
          serviceTypeId: input.serviceTypeId,
          serviceDate: input.serviceDate,
          adviser: input.adviser,
          notes: input.notes,
        },
      })
    }
    return create.mutateAsync(input)
  }

  return {
    initialValues,
    isLoadingInitial: existing.isLoading,
    save,
    isSaving: create.isPending || update.isPending,
    error: create.error ?? update.error,
    reset: () => {
      create.reset()
      update.reset()
    },
    isLive: true,
  }
}

/**
 * Guidance log — module 9.
 *
 * Same shape as the office, and for the same reason: the person fields are
 * sent on CREATE only. `useUpdateGuidanceRecord` never rewrites person_id,
 * because moving a record to a different producer moves D0.1 for two people at
 * once and can drop one of them out of a quarter entirely if it was their
 * first guidance. Correcting the wrong person is delete-and-re-enter.
 */
function useGuidanceWrite(id: string | undefined, enabled: boolean): ModuleWrite {
  const existing = useGuidanceRecord(enabled && id ? id : undefined, enabled)
  const create = useCreateGuidanceRecord()
  const update = useUpdateGuidanceRecord()

  const initialValues = useMemo((): FormValues | null => {
    const g = existing.data
    if (!g) return null
    return {
      nid: g.nationalId,
      nid2: g.nationalId,
      name: g.fullName,
      sex: g.sex ?? '',
      phone: g.phone ?? '',
      gdType: g.guidanceTypeId,
      date: g.guidanceDate,
      deliveredBy: g.deliveredBy ?? '',
    }
  }, [existing.data])

  const toInput = (v: FormValues): GuidanceInput => {
    const ageText = str(v, 'age')
    return {
      nationalId: str(v, 'nid'),
      fullName: str(v, 'name'),
      sex: str(v, 'sex') || null,
      age: ageText ? Number(ageText) : null,
      // OQ-22: a person with an age and no date of birth can never be found by
      // the public lookup afterwards, so this is asked for wherever the
      // participant knows it. Blank stays null and age carries the row.
      dateOfBirth: str(v, 'dob') || null,
      phone: str(v, 'phone') || null,
      guidanceTypeId: str(v, 'gdType'),
      guidanceDate: str(v, 'date'),
      deliveredBy: str(v, 'deliveredBy') || null,
    }
  }

  const save = async (v: FormValues) => {
    const input = toInput(v)
    if (id && existing.data) {
      return update.mutateAsync({
        id,
        input: {
          guidanceTypeId: input.guidanceTypeId,
          guidanceDate: input.guidanceDate,
          deliveredBy: input.deliveredBy,
        },
      })
    }
    return create.mutateAsync(input)
  }

  return {
    initialValues,
    isLoadingInitial: existing.isLoading,
    save,
    isSaving: create.isPending || update.isPending,
    error: create.error ?? update.error,
    reset: () => {
      create.reset()
      update.reset()
    },
    isLive: true,
  }
}

export function useModuleWrite(
  module: ModuleId,
  id: string | undefined,
  locale: string,
): ModuleWrite {
  const mockValues = useEditValues(module, id)
  const pn = usePartnerWrite(id, module === 'pn')
  const ex = useExhibitionWrite(id, module === 'ex')
  const tc = useCompletionWrite(id, module === 'tc', locale)
  const os = useOfficeWrite(id, module === 'os')
  const gd = useGuidanceWrite(id, module === 'gd')

  if (module === 'gd') return gd
  if (module === 'os') return os
  if (module === 'pn') return pn
  if (module === 'ex') return ex
  if (module === 'tc') return tc
  return { ...IDLE, initialValues: mockValues }
}

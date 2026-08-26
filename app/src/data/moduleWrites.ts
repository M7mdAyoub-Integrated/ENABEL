import { useMemo } from 'react'
import type { ModuleId } from '../modules'
import type { FormValues } from '../forms/useFormSchema'
import { useEditValues } from '../hooks/useData'
import {
  usePartnership,
  useCreatePartnership,
  useUpdatePartnership,
  type PartnershipInput,
} from './partnerships'

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
 * Partnerships — module 1.
 *
 * `established_on` is NOT NULL in the schema and the prototype's form has no
 * field for it. Rather than invent a control the design does not have, a new
 * partnership is established today. That is the truthful reading: the record is
 * created when the coordinator registers the relationship. Flagged in the
 * hand-off notes; if the Municipality needs to backdate one, the form needs a
 * date field and this line goes away.
 */
function usePartnershipWrite(
  module: 'tp' | 'pp',
  id: string | undefined,
  enabled: boolean,
): ModuleWrite {
  const type = module === 'tp' ? 'training' : 'production_support'
  const existing = usePartnership(enabled && id ? id : undefined)
  const create = useCreatePartnership(type)
  const update = useUpdatePartnership(type)

  const initialValues = useMemo((): FormValues | null => {
    const p = existing.data
    if (!p) return null
    return {
      name: p.name,
      unit: p.unit ?? '',
      contact: p.contactPerson ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      type: p.partnerTypeId,
      typeOther: p.partnerTypeOther ?? '',
      role: p.roleIds,
    }
  }, [existing.data])

  const toInput = (v: FormValues): PartnershipInput => ({
    name: str(v, 'name'),
    unit: str(v, 'unit') || null,
    contactPerson: str(v, 'contact') || null,
    phone: str(v, 'phone') || null,
    email: str(v, 'email') || null,
    partnerTypeId: str(v, 'type'),
    partnerTypeOther: str(v, 'typeOther') || null,
    roleIds: arr(v, 'role'),
    roleOther: {},
    establishedOn: existing.data?.establishedOn ?? new Date().toISOString().slice(0, 10),
  })

  const save = async (v: FormValues) => {
    if (id && existing.data) {
      return update.mutateAsync({
        id,
        partnerId: existing.data.partnerId,
        input: toInput(v),
        currentRoleIds: existing.data.roleIds,
      })
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

export function useModuleWrite(module: ModuleId, id: string | undefined): ModuleWrite {
  const mockValues = useEditValues(module, id)
  const tp = usePartnershipWrite('tp', id, module === 'tp')
  const pp = usePartnershipWrite('pp', id, module === 'pp')

  if (module === 'tp') return tp
  if (module === 'pp') return pp
  return { ...IDLE, initialValues: mockValues }
}

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentMunicipality } from '../data/municipalities'
import { EmptyState } from '../ui/primitives'
import { RMTH_FORM_IDS, type RmthFormId } from './forms.generated'
import { useParams } from 'react-router-dom'
import NotFound from '../routes/NotFound'

/**
 * The Ramtha screens belong to the municipality whose forms they are. The
 * database would answer an empty list to anyone else (the gate on every
 * table); this says why, instead of showing a Sahel Horan coordinator an
 * empty Ramtha screen that looks like a bug.
 *
 * The municipality comes from the account (or the super admin's switch),
 * never from the URL -- plan §3.4.
 */
export function RequireRamtha({ children }: { children: ReactNode }) {
  const { t } = useTranslation('rmth')
  const municipality = useCurrentMunicipality()
  const { form } = useParams()
  if (form && !(RMTH_FORM_IDS as string[]).includes(form as RmthFormId)) return <NotFound />
  if (!municipality) return null
  if (municipality.code !== 'RMTH') {
    return <div className="mt-8"><EmptyState heading title={t('gate.title')} description={t('gate.body')} /></div>
  }
  return <>{children}</>
}

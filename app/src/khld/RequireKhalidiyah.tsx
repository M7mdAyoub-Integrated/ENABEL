import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useCurrentMunicipality } from '../data/municipalities'
import { EmptyState } from '../ui/primitives'
import { KHLD_FORM_IDS, type KhldFormId } from './forms.generated'
import NotFound from '../routes/NotFound'

/**
 * The Khalidiyah screens belong to the municipality whose forms they are.
 * The database would answer an empty list to anyone else (the gate on every
 * table); this says why, instead of showing a Sahel Horan or Ramtha
 * coordinator an empty Khalidiyah screen that looks like a bug.
 *
 * The municipality comes from the account (or the super admin's switch),
 * never from the URL -- the same shape as RequireRamtha.
 */
export function RequireKhalidiyah({ children }: { children: ReactNode }) {
  const { t } = useTranslation('khld')
  const municipality = useCurrentMunicipality()
  const { form } = useParams()
  if (form && !(KHLD_FORM_IDS as string[]).includes(form as KhldFormId)) return <NotFound />
  if (!municipality) return null
  if (municipality.code !== 'KHLD') {
    return <div className="mt-8"><EmptyState heading title={t('gate.title')} description={t('gate.body')} /></div>
  }
  return <>{children}</>
}

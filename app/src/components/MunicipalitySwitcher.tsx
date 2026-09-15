import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { useMunicipalities, useMunicipalityName } from '../data/municipalities'

/**
 * The super admin's switcher (plan §3.4).
 *
 * A municipal account has no switcher: its municipality comes from its
 * account and never from the URL. A super admin does, and it writes
 * `app_user.acting_municipality_id` in the DATABASE — so the choice is a fact
 * every policy and every column default reads, not a piece of browser state
 * that one screen could forget. `setActingMunicipality` clears the query cache
 * afterwards, because every scoped read answers differently.
 *
 * The empty choice ("all municipalities") is the comparison view: reads see
 * both programmes and no form can be submitted, because the column default
 * is null and NOT NULL refuses. The MunicipalityGate in App.tsx keeps a super
 * admin out of the municipal screens until one is chosen.
 */
export function MunicipalitySwitcher() {
  const { t } = useTranslation('nav')
  const { isSuperAdmin, municipalityId, setActingMunicipality } = useAuth()
  const { data: municipalities } = useMunicipalities()
  const name = useMunicipalityName()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isSuperAdmin) return null

  const options = (municipalities ?? []).filter((m) => m.is_active)

  return (
    <label className="flex min-h-11 items-center gap-2 border-[1.5px] border-ink bg-bg px-[11px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink sm:min-h-0">
      <span className="hidden sm:inline">{t('switchMunicipality')}</span>
      <select
        aria-label={t('switchMunicipality')}
        value={municipalityId ?? ''}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.value || null
          setBusy(true)
          setError(null)
          const { error: err } = await setActingMunicipality(next)
          setBusy(false)
          if (err) {
            setError(err)
            return
          }
          // A record open on screen belongs to the municipality just left.
          // Land on the dashboard, which reads the new one -- with the choice
          // in the URL, so the address can be shared. ActingMunicipalityUrl
          // keeps the two in step from here.
          const chosen = options.find((m) => m.id === next)
          navigate(chosen ? `/dashboard?m=${chosen.slug}` : '/dashboard', { replace: true })
        }}
        className="bg-bg font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-ink outline-none"
      >
        <option value="">{t('allMunicipalities')}</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {name(m)}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-[11px] normal-case tracking-normal text-error">
          {t('switchFailed')}
        </span>
      ) : null}
    </label>
  )
}

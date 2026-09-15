import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useMunicipalities } from '../data/municipalities'

/**
 * The URL half of the super admin's municipality choice.
 *
 * The choice itself lives in the database (`app_user.acting_municipality_id`,
 * 0117): every policy and every column default reads it, so it can never be
 * a piece of browser state one screen forgets. But a fact only the database
 * holds cannot be shared or bookmarked, and "look at Ramtha's dashboard"
 * needs an address. This keeps `?m=<slug>` on every municipal route equal to
 * the choice, in both directions:
 *
 *   - the URL has no `m` and a municipality is chosen: the slug is written
 *     in, replacing the history entry, so the address bar always says which
 *     municipality the screen shows;
 *   - the URL names a different active municipality than the one chosen: the
 *     database is switched to match. A shared or bookmarked address opens on
 *     the municipality it names;
 *   - the URL names something that is not a municipality: it is dropped, and
 *     the database's choice stands.
 *
 * A municipal account's municipality comes from its account and never from
 * the URL, so for them the parameter is simply removed. Renders nothing.
 */
export function ActingMunicipalityUrl() {
  const { isSuperAdmin, roleResolved, municipalityId, setActingMunicipality } = useAuth()
  const { data: municipalities } = useMunicipalities()
  const [params, setParams] = useSearchParams()
  const requested = params.get('m')
  // The switch in flight, so a re-render while it runs does not start it again.
  const switching = useRef<string | null>(null)

  useEffect(() => {
    if (!roleResolved || !municipalities) return

    const write = (slug: string | null) => {
      const next = new URLSearchParams(params)
      if (slug) next.set('m', slug)
      else next.delete('m')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }

    if (!isSuperAdmin) {
      if (requested !== null) write(null)
      return
    }

    const chosen = municipalities.find((m) => m.id === municipalityId) ?? null
    if (requested === null) {
      if (chosen) write(chosen.slug)
      return
    }
    if (chosen && chosen.slug === requested) return

    const target = municipalities.find((m) => m.slug === requested && m.is_active)
    if (!target) {
      write(chosen ? chosen.slug : null)
      return
    }
    if (switching.current === target.id) return
    switching.current = target.id
    void setActingMunicipality(target.id).then(({ error }) => {
      switching.current = null
      // The database refused; the address must not go on claiming otherwise.
      if (error) write(chosen ? chosen.slug : null)
    })
  }, [isSuperAdmin, roleResolved, municipalityId, municipalities, requested, params, setParams, setActingMunicipality])

  return null
}

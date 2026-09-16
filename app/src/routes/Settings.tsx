import { useTranslation } from 'react-i18next'
import { Card, SectionRule } from '../ui/primitives'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { VerificationGaps } from '../components/VerificationGaps'
import { EvidenceStorageCard } from '../components/EvidenceStorageCard'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'

/**
 * The settings every signed-in role has: the language, and for staff the
 * two platform-wide worklists that belong to no form.
 *
 * Rendered inside the platform dialog (layout/PlatformDialog.tsx), never as a
 * page of its own: settings are the platform's, not a municipality's, and a
 * municipality's sidebar is only its own product. `/settings` still exists
 * as an address and opens the dialog here.
 *
 * This used to end with an empty state saying "user roles … are seeded and
 * changed in the database". Roles have been changed on the accounts screen
 * since 0117, so the sentence was a placeholder that had gone stale — the
 * shape CLAUDE.md's register warns about. The intro now names what is set
 * here and what is not, and nothing else claims to know where the rest lives.
 */
export function SettingsSections() {
  const { t } = useTranslation(['common'])
  const { role } = useAuth()
  return (
    <>
      <p className="text-[15px] leading-relaxed text-body">{t('common:settings.intro')}</p>

      {/* Language is genuinely settable here. */}
      <Card as="section" className="mt-[18px] p-5">
        <SectionRule title={t('common:language.label')} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-body">{t('common:settings.languageHelp')}</p>
          <LocaleSwitcher />
        </div>
      </Card>

      {/* People the public site cannot identify — OQ-22.
          Here rather than on the dashboard because it counts nothing the donor
          asked for: it is a data-quality worklist about the platform's own
          reachability.

          Gated on record.edit, which matches the database rather than
          duplicating it: `person_read` is is_staff(), so partner_viewer and a
          participant get zero rows from RLS either way. */}
      {can(role, 'record.edit') ? <VerificationGaps /> : null}

      {/* Evidence storage: the platform total against the 10 GB the store
          includes, the 9 GB stop, and the largest consumers. Staff only, the
          same gate as evidence_usage() itself (is_staff). */}
      {can(role, 'record.edit') ? <EvidenceStorageCard /> : null}
    </>
  )
}

export default SettingsSections

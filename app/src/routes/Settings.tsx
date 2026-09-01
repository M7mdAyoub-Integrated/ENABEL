import { useTranslation } from 'react-i18next'
import { AccentRule, Card, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { LocaleSwitcher } from '../components/LocaleSwitcher'

export function Settings() {
  const { t } = useTranslation(['nav', 'common'])
  return (
    <>
      <PageHead title={t('nav:settings')} description={t('common:settings.intro')} />
      <AccentRule className="bg-ink" />

      {/* Language is genuinely settable here, and it is the only thing that is.
          The page description used to read "Visual placeholder. Nothing is
          configurable in this prototype." directly above this working control,
          and the empty state below promised the rest "once the platform is
          built" — which it now is. Both said something untrue about the screen
          they were on. They now say where those settings actually live:
          `indicator_target`, `app_user.role` and `reporting_period`, all seeded
          and changed in the database. */}
      <Card as="section" className="mt-[18px] p-5">
        <SectionRule title={t('common:language.label')} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-body">{t('common:settings.languageHelp')}</p>
          <LocaleSwitcher />
        </div>
      </Card>

      <div className="mt-[18px]">
        <EmptyState
          title={t('common:settings.emptyTitle')}
          description={t('common:settings.emptyBody')}
        />
      </div>
    </>
  )
}

export default Settings

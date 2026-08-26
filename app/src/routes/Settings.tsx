import { useTranslation } from 'react-i18next'
import { AccentRule, Card, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { LocaleSwitcher } from '../components/LocaleSwitcher'

export function Settings() {
  const { t } = useTranslation(['nav', 'common'])
  return (
    <>
      <PageHead title={t('nav:settings')} description={t('common:settings.intro')} />
      <AccentRule className="bg-ink" />

      {/* The prototype's Settings is a single dead placeholder. Language is real
          here, so it gets a live panel above the placeholder rather than being
          hidden behind a screen that says nothing works yet. */}
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

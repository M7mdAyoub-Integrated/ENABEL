import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, MODULES, ACCENT_BG } from '../modules'
import { useAuth } from '../auth/AuthProvider'
import { canWriteModule } from '../auth/permissions'
import { useModuleRows } from '../data/moduleRows'
import type { RowAction } from '../ui/DataTable'
import { ListTable } from '../ui/ListTable'
import { AccentRule, PageHead, Pill, PrimaryButton } from '../ui/primitives'
import { NotFound } from './NotFound'
import { SEP } from '../ui/glyphs'

/**
 * A module's list screen, copied from the prototype.
 *
 * Head: objective pill + "Feeds A1.2 · G0.4" · uppercase display title ·
 * description · CTA, then the module's 6px accent bar. Below it the list
 * every municipality shares (ListTable): search, count and a filter under
 * every column.
 */
export function ListScreen() {
  const { module } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['nav', 'common', 'forms'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()

  const valid = isModuleId(module)
  const tx = makeTranslate(t)
  const source = useModuleRows(valid ? module : 'tp', tx, locale)
  const rows = source.rows

  if (!valid) return <NotFound />

  const meta = MODULES[module]
  const title = t(`nav:module.${module}`)
  const indicators = meta.indicators.join(` ${SEP} `)
  const columns = Array.from({ length: meta.columnCount }, (_, i) =>
    t(`forms:columns.${module}.${i}`),
  )
  const writable = canWriteModule(role, module)

  /**
   * One action per row, "Open", as on every other list (ListTable): Edit and
   * Delete are on the record's page, where the delete dialog states which
   * indicators drop. The owner asked on 30 September 2026 for Sahel Horan's
   * lists to match Ramtha's and Khalidiyah's.
   */
  const rowActions = (): RowAction[] => [
    { id: 'open', label: t('common:actions.open'), onSelect: (id) => navigate(`/forms/${module}/${id}`) },
  ]

  return (
    <>
      <PageHead
        chips={
          <>
            <Pill className={ACCENT_BG[meta.accent]}>{t(`nav:objective.${module}`)}</Pill>
            <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('forms:feeds', { list: indicators })}
            </span>
          </>
        }
        title={title}
        description={t(`forms:description.${module}`)}
        action={
          writable ? (
            <PrimaryButton onClick={() => navigate(`/forms/${module}/new`)}>
              {t(`forms:cta.${module}`)}
            </PrimaryButton>
          ) : undefined
        }
      />
      <AccentRule className={ACCENT_BG[meta.accent]} />

      <ListTable
        columns={columns}
        rows={rows}
        actions={() => rowActions()}
        recordLabel={t('forms:record')}
        isLoading={source.isLoading}
        isError={source.isError}
        error={source.error}
        onRetry={source.refetch}
        searchPlaceholder={t(`forms:searchPlaceholder.${module}`)}
        empty={{
          title: t('forms:empty.title'),
          description: t('forms:empty.desc', { name: title, indicators }),
          ...(writable
            ? { action: <PrimaryButton onClick={() => navigate(`/forms/${module}/new`)}>{t(`forms:cta.${module}`)}</PrimaryButton> }
            : {}),
        }}
      />
    </>
  )
}

export default ListScreen

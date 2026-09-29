import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, MODULES, ACCENT_BG } from '../modules'
import { useAuth } from '../auth/AuthProvider'
import { can, canWriteModule } from '../auth/permissions'
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
   * Row actions: View, then Edit and Delete when the role allows them --
   * 05 sections 4 and 5, so a data_entry user sees View and Edit and no more.
   */
  // ── THE APPROVE / REJECT ROW ACTIONS WERE REMOVED HERE ──
  //
  // They rendered on `module === 'rg'`, retired and redirected to /forms/ex
  // since 2f8edff, so they were unreachable. And they called
  // `mutations.setRegistrationStatus` — the session-local MOCK — then fired
  // "Approved". Nothing was written, and E0.2 counts approved registrations,
  // so had the redirect gone away a coordinator would have approved a producer
  // into a market and watched the indicator stay still.
  //
  // The real decision is on /exhibitions/:id. `pending` is gone with them: it
  // was only ever `module === 'rg' && …`.
  const rowActions = (): RowAction[] => {
    const list: RowAction[] = []

    list.push({
      id: 'view',
      label: t('forms:action.view'),
      onSelect: (id) => navigate(`/forms/${module}/${id}`),
    })

    if (writable) {
      list.push({
        id: 'edit',
        label: t('forms:action.edit'),
        onSelect: (id) => navigate(`/forms/${module}/${id}/edit`),
      })
    }
    if (can(role, 'record.delete')) {
      list.push({
        id: 'delete',
        label: t('forms:action.delete'),
        tone: 'danger',
        // Straight to the record, where the delete dialog states which
        // indicators drop. A one-click destructive action in a table row is
        // not something a donor-facing register should offer.
        onSelect: (id) => navigate(`/forms/${module}/${id}`),
      })
    }
    return list
  }

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

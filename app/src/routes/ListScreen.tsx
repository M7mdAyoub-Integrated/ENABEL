import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, MODULES, ACCENT_BG } from '../modules'
import { useAuth } from '../auth/AuthProvider'
import { can, canWriteModule } from '../auth/permissions'
import { useModuleRows } from '../data/moduleRows'
import { TableSkeleton, ErrorState } from '../ui/states'
import { DataTable, type RowAction } from '../ui/DataTable'
import { AccentRule, EmptyState, PageHead, Pill, PrimaryButton, SecondaryButton } from '../ui/primitives'
import { NotFound } from './NotFound'
import { SEP } from '../ui/glyphs'

/**
 * A module's list screen, copied from the prototype.
 *
 * Head: objective pill + "Feeds A1.2 · G0.4" · uppercase display title ·
 * description · CTA, then the module's 6px accent bar. Below it the single
 * bordered control strip -- search, filter and the live count share ONE 1.5px
 * frame with hairlines between, which is what makes them read as one control.
 */
export function ListScreen() {
  const { module } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['nav', 'common', 'forms'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')

  const valid = isModuleId(module)
  const tx = makeTranslate(t)
  const source = useModuleRows(valid ? module : 'tp', tx, locale)
  const rows = source.rows


  const filterValues = useMemo(
    () => Array.from(new Set(rows.map((r) => r.filterValue).filter(Boolean))).sort(),
    [rows],
  )

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!query || r.search.toLowerCase().includes(query.toLowerCase())) &&
          (!filter || r.filterValue === filter),
      ),
    [rows, query, filter],
  )

  if (!valid) return <NotFound />

  const meta = MODULES[module]
  const title = t(`nav:module.${module}`)
  const indicators = meta.indicators.join(` ${SEP} `)
  const columns = Array.from({ length: meta.columnCount }, (_, i) =>
    t(`forms:columns.${module}.${i}`),
  )
  const filtering = !!query || !!filter
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

      {/* Search · filter · count, sharing one frame. Stacks on phones. */}
      <div className="mt-5 flex flex-col border-[1.5px] border-ink sm:flex-row sm:items-stretch">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('forms:searchLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(`forms:searchPlaceholder.${module}`)}
            className="w-full min-w-0 border-0 bg-bg px-[14px] py-[11px] text-[15px] text-ink placeholder:text-ghost"
          />
        </label>
        <label className="flex-none border-t-[1.5px] border-ink sm:max-w-[270px] sm:border-t-0 sm:border-s-[1.5px]">
          <span className="sr-only">{t('forms:filterLabel')}</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-11 w-full cursor-pointer border-0 bg-raised px-[14px] py-[11px] font-narrow text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink"
          >
            <option value="">{t(`forms:filterAll.${module}`)}</option>
            {filterValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <span className="flex flex-none items-center whitespace-nowrap border-t-[1.5px] border-ink px-[14px] py-2 font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-muted sm:border-t-0 sm:border-s-[1.5px] sm:py-0">
          {t('forms:countOf', { shown: shown.length, total: rows.length })}
        </span>
      </div>

      {source.isLoading ? (
        <TableSkeleton columns={meta.columnCount} />
      ) : source.isError ? (
        <ErrorState error={source.error} onRetry={source.refetch} />
      ) : shown.length === 0 ? (
        <div className="mt-[18px]">
          <EmptyState
            title={filtering ? t('forms:empty.filteredTitle') : t('forms:empty.title')}
            description={
              filtering
                ? t('forms:empty.filteredDesc', { name: title, total: rows.length })
                : t('forms:empty.desc', { name: title, indicators })
            }
            actions={
              <>
                {filtering ? (
                  <SecondaryButton
                    onClick={() => {
                      setQuery('')
                      setFilter('')
                    }}
                  >
                    {t('forms:empty.clear')}
                  </SecondaryButton>
                ) : null}
                {writable ? (
                  <PrimaryButton onClick={() => navigate(`/forms/${module}/new`)}>
                    {t(`forms:cta.${module}`)}
                  </PrimaryButton>
                ) : null}
              </>
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={shown}
          actions={() => rowActions()}
          recordLabel={t('forms:record')}
        />
      )}
    </>
  )
}

export default ListScreen

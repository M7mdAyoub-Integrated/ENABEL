import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useContributionsForPartner,
  useCreateContribution,
  useUpdateContribution,
  useDeleteContribution,
  CONTRIBUTION_TYPES,
  type ContributionRow,
  type ContributionType,
} from '../data/contributions'
import {
  useIndicatorRows,
  useReportingPeriods,
  currentPeriodCode,
  actualText,
  targetText,
} from '../data/indicators'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { WriteError } from '../ui/states'
import { isolateLtr } from './BidiIsolate'
import { formatShortDate } from '../lib/format'

/**
 * The G0.4 log for one partnership.
 *
 * Rows written by a trigger are marked and are read-only: they track their
 * parent in both directions, so an edit here would be overwritten the next
 * time the parent was touched. The panel says where each came from and what
 * would have to change to withdraw it, rather than offering a delete that
 * reverses itself.
 *
 * The figure is READ from `v_indicator_progress`. Counting the rows below would
 * be a second implementation of G0.4 and it would be wrong twice over: these
 * are one partnership's contributions across all time, and G0.4 is every
 * partner's, inside one quarter, counted once each.
 */
type FormState = {
  id: string | null
  date: string
  type: ContributionType
  description: string
  /** Which agreement it was made under. Only asked when there are two. */
  partnershipId: string
}

const BLANK = (partnershipId: string): FormState => ({
  id: null,
  date: '',
  type: 'service',
  description: '',
  partnershipId,
})

/**
 * Keyed on the ORGANISATION since the merge.
 *
 * `partnerships` is what the body holds -- one row, two, or none. It decides
 * three things: whether the log has anywhere to write at all, whether the form
 * has to ASK which agreement a hand-entered contribution belongs to, and
 * whether each row is labelled with its agreement.
 */
export function ContributionLog({
  partnerId,
  partnerships,
}: {
  partnerId: string
  partnerships: { id: string; type: string }[]
}) {
  const { t, i18n } = useTranslation(['forms', 'common', 'indicators'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()

  const q = useContributionsForPartner(partnerId)
  const create = useCreateContribution()
  const update = useUpdateContribution()
  const remove = useDeleteContribution()

  const periods = useReportingPeriods()
  const periodCode = currentPeriodCode(periods.data ?? [])
  const indicators = useIndicatorRows(periodCode)
  const g04 = (indicators.data ?? []).find((r) => r.code === 'G0.4')

  const only = partnerships.length === 1 ? partnerships[0]!.id : ''
  const [form, setForm] = useState<FormState>(BLANK(only))
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)

  const mayWrite = can(role, 'record.edit')
  const mayDelete = can(role, 'record.delete')
  const rows = q.data ?? []

  const dateErr = touched && !form.date ? t('forms:contribution.dateRequired') : ''
  const descErr = touched && !form.description.trim() ? t('forms:contribution.descRequired') : ''
  // `partner_contribution.partnership_id` is NOT NULL, so an organisation with
  // no live agreement has nowhere to put one. Say so rather than offering a
  // form whose save can only fail.
  const chosenPartnership = form.partnershipId || only
  const psErr =
    touched && !chosenPartnership ? t('forms:contribution.partnershipRequired') : ''
  const valid = !!form.date && !!form.description.trim() && !!chosenPartnership

  const startEdit = (c: ContributionRow) => {
    setTouched(false)
    setForm({
      id: c.id,
      date: c.contributedOn,
      type: (CONTRIBUTION_TYPES as readonly string[]).includes(c.contributionType)
        ? (c.contributionType as ContributionType)
        : 'other',
      description: c.description,
      partnershipId: c.partnershipId,
    })
  }

  const submit = () => {
    setTouched(true)
    if (!valid) return
    const payload = {
      partnershipId: chosenPartnership,
      contributedOn: form.date,
      contributionType: form.type,
      description: form.description,
    }
    const done = () => {
      setForm(BLANK(only))
      setTouched(false)
    }
    if (form.id) update.mutate({ id: form.id, input: payload }, { onSuccess: done })
    else create.mutate(payload, { onSuccess: done })
  }

  return (
    <section className="mt-8 border-[1.5px] border-slate p-4">
      <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-slate">
        {t('forms:contribution.heading')}
      </h2>
      <p className="mt-1 max-w-[64ch] text-[14px] leading-[1.5] text-body">
        {t('forms:contribution.body')}
      </p>

      {g04 ? (
        <p className="mt-2 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
          {t('forms:contribution.g04Line', {
            // See the note on isolateLtr: a period code inside an Arabic
            // sentence is reordered by bidi unless it is isolated.
            period: isolateLtr(g04.period_code),
            actual: actualText(g04, t('indicators:noValue')),
            target: targetText(g04, t('indicators:targetNotSet')),
          })}
        </p>
      ) : null}

      {q.isLoading ? (
        <div aria-hidden="true" className="mt-4 h-16 animate-pulse bg-track" />
      ) : rows.length === 0 ? (
        <p className="mt-4 border-[1.5px] border-dashed border-border-muted p-5 text-center text-[15px] text-muted">
          {t('forms:contribution.none')}
        </p>
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-2 p-0">
          {rows.map((c) => (
            <li key={c.id} className="border-[1.5px] border-border-default bg-bg p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                  {formatShortDate(c.contributedOn, locale)}
                </span>
                <span className="border border-border-strong px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t(`forms:contribution.type.${c.contributionType}`, {
                    defaultValue: c.contributionType,
                  })}
                </span>
                {c.isAutomatic ? (
                  <span className="border-[1.5px] border-dashed border-teal px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-teal">
                    {t('forms:contribution.automatic')}
                  </span>
                ) : null}
                {/* Only when the organisation holds both. With one agreement
                    the chip would repeat on every row and say nothing. */}
                {partnerships.length > 1 && c.partnershipType ? (
                  <span className="border border-border-default px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
                    {t(`common:enums.partnershipType.${c.partnershipType}`, {
                      defaultValue: c.partnershipType,
                    })}
                  </span>
                ) : null}
              </div>
              <p dir="auto" className="mt-1 text-[15px] text-ink">
                {c.description}
              </p>

              {c.isAutomatic ? (
                <p className="mt-1 text-[13px] text-muted">
                  {t(`forms:contribution.from.${c.entityType}`, {
                    defaultValue: t('forms:contribution.fromUnknown'),
                  })}
                </p>
              ) : mayWrite ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted underline hover:text-ink"
                  >
                    {t('common:actions.edit')}
                  </button>
                  {mayDelete ? (
                    confirming === c.id ? (
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="text-[13px] text-error">
                          {t('forms:contribution.deleteWarn')}
                        </span>
                        <button
                          type="button"
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate(
                              { id: c.id, partnershipId: c.partnershipId },
                              { onSettled: () => setConfirming(null) },
                            )
                          }
                          className="min-h-11 bg-error px-3 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
                        >
                          {t('forms:deleteConfirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted underline hover:text-ink"
                        >
                          {t('forms:deleteCancel')}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(c.id)}
                        className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-error underline"
                      >
                        {t('common:actions.delete')}
                      </button>
                    )
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {remove.isError ? <WriteError error={remove.error} onDismiss={() => remove.reset()} /> : null}

      {mayWrite ? (
        <div className="mt-5 border-t-[1.5px] border-border-default pt-4">
          <h3 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            {form.id ? t('forms:contribution.editOne') : t('forms:contribution.addOne')}
          </h3>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.5] text-muted">
            {t('forms:contribution.addNote')}
          </p>

          {partnerships.length === 0 ? (
            <p
              role="status"
              className="mt-3 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body"
            >
              {t('forms:contribution.noAgreement')}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Asked ONLY when there are two. `partnership_id` is NOT NULL, so
                the answer is never absent -- with one agreement it is known and
                a select offering a single option is a question with no
                information in it. */}
            {partnerships.length > 1 ? (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('forms:contribution.underWhich')}
                  <span aria-hidden="true" className="ms-1 text-error">
                    {t('forms:requiredMark')}
                  </span>
                </span>
                <select
                  value={form.partnershipId}
                  onChange={(e) => setForm({ ...form, partnershipId: e.target.value })}
                  aria-invalid={!!psErr}
                  className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink"
                >
                  <option value="">{t('forms:selectOption')}</option>
                  {partnerships.map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {t(`common:enums.partnershipType.${ps.type}`, { defaultValue: ps.type })}
                    </option>
                  ))}
                </select>
                {psErr ? (
                  <span role="alert" className="text-[13px] font-semibold text-error">
                    {psErr}
                  </span>
                ) : null}
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:contribution.date')}
                <span aria-hidden="true" className="ms-1 text-error">
                  {t('forms:requiredMark')}
                </span>
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                aria-invalid={!!dateErr}
                className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink"
              />
              {dateErr ? (
                <span role="alert" className="text-[13px] font-semibold text-error">
                  {dateErr}
                </span>
              ) : null}
              <span className="text-[12.5px] text-muted">{t('forms:contribution.dateHelp')}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:contribution.typeLabel')}
              </span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ContributionType })}
                className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink"
              >
                {CONTRIBUTION_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`forms:contribution.type.${v}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:contribution.description')}
                <span aria-hidden="true" className="ms-1 text-error">
                  {t('forms:requiredMark')}
                </span>
              </span>
              <input
                type="text"
                dir="auto"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                aria-invalid={!!descErr}
                placeholder={t('forms:contribution.descriptionPh')}
                className="min-h-11 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink placeholder:text-ghost"
              />
              {descErr ? (
                <span role="alert" className="text-[13px] font-semibold text-error">
                  {descErr}
                </span>
              ) : null}
            </label>
          </div>

          {create.isError ? (
            <WriteError error={create.error} onDismiss={() => create.reset()} />
          ) : null}
          {update.isError ? (
            <WriteError error={update.error} onDismiss={() => update.reset()} />
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={create.isPending || update.isPending}
              onClick={submit}
              className="inline-flex min-h-11 items-center justify-center bg-slate px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg disabled:bg-track disabled:text-faint"
            >
              {form.id ? t('forms:saveChanges') : t('forms:contribution.save')}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => {
                  setForm(BLANK(only))
                  setTouched(false)
                }}
                className="inline-flex min-h-11 items-center justify-center border-[1.5px] border-border-strong px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink"
              >
                {t('forms:deleteCancel')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ContributionLog

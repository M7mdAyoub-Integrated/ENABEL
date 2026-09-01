import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePartner, useDeletePartnership } from '../data/partnerships'
import { refLabel, useRef } from '../data/refTables'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { WriteError } from '../ui/states'
import { formatDate } from '../lib/format'
import { EMPTY } from '../ui/glyphs'
import { useState } from 'react'

/**
 * The agreements one organisation holds.
 *
 * ── WHY THIS IS A PANEL AND NOT MORE KEY/VALUE ROWS ──
 *
 * Partner type, roles and the established date belong to a PARTNERSHIP, and an
 * organisation may hold two. In the flat list above this panel there is one row
 * per label, so two partnerships would mean either showing one of the two at
 * random or prefixing every label with its type. Neither reads.
 *
 * ── WHAT EACH BLOCK IS FOR, IN THE DONOR RETURN ──
 *
 * A1.2 counts TRAINING partnerships and C1.1 counts PRODUCTION-SUPPORT ones, so
 * each block is one indicator's worth of this organisation. The panel names the
 * indicator on the block rather than leaving a coordinator to remember which is
 * which -- and it is the clearest place to see that the type kept doing its
 * work when the two forms merged into one.
 *
 * G0.4 is deliberately NOT named here. It counts distinct partners with a
 * contribution in the period, so it belongs to the organisation rather than to
 * either agreement, and it is stated once on the contributions log below.
 */
export function PartnershipsPanel({ partnerId }: { partnerId: string }) {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const q = usePartner(partnerId)
  const del = useDeletePartnership('training')
  const [confirming, setConfirming] = useState<string | null>(null)

  const trainingTypes = useRef('partner_type_training')
  const productionTypes = useRef('partner_type_production')
  const trainingRoles = useRef('partner_role_training')
  const productionRoles = useRef('partner_role_production')

  const mayDelete = can(role, 'record.delete')
  const mayEdit = can(role, 'record.edit')
  const held = q.data?.partnerships ?? []

  return (
    <section className="mt-8 border-[1.5px] border-ink p-4">
      <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-ink">
        {t('forms:partner.agreementsHeading')}
      </h2>
      <p className="mt-1 max-w-[64ch] text-[14px] leading-[1.5] text-body">
        {t('forms:partner.agreementsBody')}
      </p>

      {q.isLoading ? (
        <div aria-hidden="true" className="mt-4 h-20 animate-pulse bg-track" />
      ) : held.length === 0 ? (
        <p className="mt-4 border-[1.5px] border-dashed border-border-muted p-5 text-center text-[15px] text-muted">
          {t('forms:partner.noAgreements')}
        </p>
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-3 p-0">
          {held.map((ps) => {
            const training = ps.type === 'training'
            const types = training ? trainingTypes : productionTypes
            const roles = training ? trainingRoles : productionRoles
            const typeRow = types.find((r) => r.id === ps.partnerTypeId)
            // An "Other (please specify)" option shows what was actually
            // typed, not the word "Other" -- the free text IS the answer.
            const typeText =
              typeRow?.allows_free_text && ps.partnerTypeOther
                ? ps.partnerTypeOther
                : refLabel(typeRow, locale)
            const roleText = ps.roleIds
              .map((rid) => {
                const row = roles.find((r) => r.id === rid)
                if (row?.allows_free_text && ps.roleOther[rid]) return ps.roleOther[rid] as string
                return refLabel(row, locale)
              })
              .filter(Boolean)
              .join(', ')

            return (
              <li
                key={ps.id}
                className={`border-[1.5px] p-3 ${training ? 'border-teal' : 'border-green'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-bg ${
                      training ? 'bg-teal' : 'bg-green'
                    }`}
                  >
                    {t(`common:enums.partnershipType.${ps.type}`)}
                  </span>
                  <span className="border border-border-strong px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t('forms:partner.feedsIndicator', { code: training ? 'A1.2' : 'C1.1' })}
                  </span>
                  {ps.isActive ? null : (
                    <span className="border border-border-strong px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
                      {t('common:chips.ended')}
                    </span>
                  )}
                </div>

                <dl className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {[
                    { k: 'partner.type', v: typeText },
                    {
                      k: training ? 'partner.roleTraining' : 'partner.roleProduction',
                      v: roleText,
                    },
                    {
                      k: 'detail.established',
                      v: formatDate(new Date(ps.establishedOn), locale),
                    },
                  ].map((f) => (
                    <div key={f.k} className="flex justify-between gap-4 border-b border-border-default py-2">
                      <dt className="flex-none basis-[42%] font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                        {t(`forms:${f.k}`)}
                      </dt>
                      <dd dir="auto" className="text-[14px] font-semibold text-ink" style={{ textAlign: 'end' }}>
                        {f.v || <span className="text-ghost">{EMPTY}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>

                {mayDelete ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {confirming === ps.id ? (
                      <>
                        <span className="text-[13px] text-error">
                          {t('forms:partner.deleteAgreementWarn', {
                            code: training ? 'A1.2' : 'C1.1',
                          })}
                        </span>
                        <button
                          type="button"
                          disabled={del.isPending}
                          onClick={() =>
                            del.mutate(ps.id, {
                              onSettled: () => {
                                setConfirming(null)
                                void q.refetch()
                              },
                            })
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
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(ps.id)}
                        className="min-h-11 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-error underline"
                      >
                        {t('forms:partner.removeAgreement')}
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {del.isError ? <WriteError error={del.error} onDismiss={() => del.reset()} /> : null}

      {/* The second agreement is added through the same form, by choosing the
          other type -- which is the whole point of the merge. Saying so is the
          only way a coordinator would know, because there is no "add a
          partnership" button and there deliberately is not one: a second button
          would be a second write path to the row the merge exists to keep
          single. */}
      {mayEdit && held.length < 2 ? (
        <p className="mt-4 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.5] text-body">
          {t('forms:partner.addOtherType')}{' '}
          <Link to={`/forms/pn/${partnerId}/edit`} className="font-semibold underline">
            {t('forms:editRecord')}
          </Link>
        </p>
      ) : null}
    </section>
  )
}

export default PartnershipsPanel

import { useTranslation } from 'react-i18next'
import { useMissingVerification } from '../data/verification'
import { BidiIsolate } from './BidiIsolate'
import { Card, SectionRule } from '../ui/primitives'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  People the public website cannot identify — OQ-22 made visible.
 *
 *  See src/data/verification.ts for what the three verification states mean and
 *  why the gap is worked at the counter rather than engineered around.
 *
 *  ── WHY THE EMPTY STATE SAYS WHAT IT SAYS ──
 *
 *  This list is empty today and should usually be empty, which makes its empty
 *  state the part most likely to mislead. "Nothing here" would read as "no such
 *  problem exists" — so it says what was checked and what a zero means, the
 *  same way the dashboard says "not set" rather than 0.
 *
 *  It is gated on `record.edit` by its caller, matching the database: `person`
 *  is readable by is_staff() only, so a partner_viewer gets zero rows from RLS
 *  regardless. Verified as each of the five roles with `set local role
 *  authenticated` plus a jwt claim — staff 4 rows, partner_viewer 0,
 *  participant 1 (their own). Testing it as the owner would have proved
 *  nothing.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VerificationGaps() {
  const { t } = useTranslation(['common'])
  const q = useMissingVerification()
  const rows = q.data ?? []
  const stuck = rows.filter((r) => r.verification_state === 'cannot_self_serve')
  const phoneOnly = rows.filter((r) => r.verification_state === 'phone_only')

  return (
    <Card as="section" className="mt-[18px] p-5">
      <SectionRule title={t('common:verification.heading')} />
      <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.55] text-body">
        {t('common:verification.intro')}
      </p>

      {q.isLoading ? (
        <div aria-hidden="true" className="mt-4 h-16 animate-pulse bg-track" />
      ) : q.isError ? (
        <p role="alert" className="mt-4 border-[1.5px] border-error p-4 text-[15px]">
          {t('common:verification.loadFailed')}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 border-[1.5px] border-dashed border-border-muted bg-sunken p-4 text-[14px] leading-[1.5] text-muted">
          {t('common:verification.none')}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {stuck.length > 0 ? (
            <div>
              <h3 className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-error">
                {t('common:verification.cannotHeading', { count: stuck.length })}
              </h3>
              <p className="mt-1 max-w-[66ch] text-[13.5px] leading-[1.5] text-body">
                {t('common:verification.cannotBody')}
              </p>
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {stuck.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-s-[3px] border-error bg-sunken px-3 py-2"
                  >
                    <span dir="auto" className="text-[14px] font-semibold text-ink">
                      {p.full_name}
                    </span>
                    <span className="flex items-baseline gap-3">
                      {p.village ? (
                        <span dir="auto" className="text-[13px] text-muted">
                          {p.village}
                        </span>
                      ) : null}
                      <BidiIsolate className="font-narrow text-[12.5px] tracking-wide text-muted">
                        {p.national_id}
                      </BidiIsolate>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {phoneOnly.length > 0 ? (
            <div>
              <h3 className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('common:verification.phoneOnlyHeading', { count: phoneOnly.length })}
              </h3>
              <p className="mt-1 max-w-[66ch] text-[13.5px] leading-[1.5] text-body">
                {t('common:verification.phoneOnlyBody')}
              </p>
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {phoneOnly.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-default px-1 py-2"
                  >
                    <span dir="auto" className="text-[14px] text-ink">
                      {p.full_name}
                    </span>
                    <BidiIsolate className="font-narrow text-[12.5px] tracking-wide text-muted">
                      {p.national_id}
                    </BidiIsolate>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../../i18n/tx'
import {
  useExhibitionOptions,
  useMutations,
  refLabel,
  useRefTable,
  usePortalPerson,
} from '../../hooks/useData'
import { Field } from '../../ui/Field'
import { SegmentBar } from '../../ui/primitives'
import { BidiIsolate } from '../../components/BidiIsolate'
import { PortalShell } from './PortalShell'
import { ARROW_START } from '../../ui/glyphs'
import { useToast } from '../../ui/Toast'

/**
 * The producer's registration request, copied from the prototype.
 *
 * Three white panels on the teal ground: which market, who you are, what you
 * will bring. Identity is READ-ONLY and comes from the producer record -- the
 * national ID is the one field a producer must never be able to change about
 * themselves, and 05 section 6 backs that with a database guard.
 */
export function PortalRegister() {
  const { t, i18n } = useTranslation(['portal', 'forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()
  const mutations = useMutations()
  const options = useExhibitionOptions(makeTranslate(t), locale)
  const productOptions = useRefTable('product')
  const producerTypeOptions = useRefTable('producer_type')
  const { person } = usePortalPerson()

  const [exhibition, setExhibition] = useState('')
  const [products, setProducts] = useState<string[]>([])
  const [producerType, setProducerType] = useState('')
  const [error, setError] = useState('')

  const chosen = options.find((o) => o.id === exhibition)

  const submit = () => {
    if (!exhibition) {
      setError(t('portal:errorNoEvent'))
      return
    }
    if (products.length === 0) {
      setError(t('portal:errorNoProducts'))
      return
    }
    mutations.addRegistration(exhibition, products, producerType || 'rpt2')
    toast.fire({
      tag: t('portal:sent'),
      title: t('portal:submitted'),
      sub: t('portal:submittedSub'),
    })
    navigate('/portal')
  }

  const sectionHeading = (label: string, first = false) => (
    <h2
      className={`m-0 border-b-[3px] border-ink pb-[7px] text-[14px] font-extrabold uppercase tracking-[0.1em] ${
        first ? '' : 'mt-[30px]'
      }`}
    >
      {label}
    </h2>
  )

  return (
    <PortalShell>
      <main
        className="mx-auto w-full max-w-[720px] px-4 pt-6 sm:px-8 sm:pt-[34px]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.375rem)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="min-h-11 cursor-pointer font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-bg opacity-80 hover:opacity-100"
        >
          <span aria-hidden="true">{ARROW_START}</span> {t('portal:backToPortal')}
        </button>

        <h1
          className="mt-4 text-[30px] font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-[40px]"
          style={{ textWrap: 'balance' }}
        >
          {t('portal:registerTitle')}
        </h1>
        <p className="mt-3.5 max-w-[520px] text-[16px] opacity-88">{t('portal:registerBody')}</p>

        {error ? (
          <div
            role="alert"
            className="mt-[22px] flex flex-wrap items-baseline gap-3 bg-bg px-4 py-[13px] text-error"
          >
            <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('portal:notSent')}
            </span>
            <span className="text-[15px] font-semibold">{error}</span>
          </div>
        ) : null}

        <div className="mt-[26px] bg-bg p-5 text-ink sm:p-6">
          {sectionHeading(t('portal:whichMarket'), true)}
          <div className="mt-4 grid grid-cols-12">
            <Field
              spec={{
                key: 'exhibition',
                label: t('portal:chooseMarket'),
                type: 'select',
                required: true,
                placeholder: t('portal:selectMarket'),
                options: options.map((o) => ({
                  value: o.id,
                  label: o.label,
                  disabled: o.disabled,
                })),
                help: t('portal:marketHelp'),
              }}
              value={exhibition}
              onChange={setExhibition}
            />
          </div>

          {chosen ? (
            <div className="mt-4 bg-amber px-[18px] py-4 text-bg">
              <div className="flex items-baseline justify-between gap-3.5">
                <span className="text-[17px] font-extrabold tracking-[-0.025em]">
                  {chosen.name}
                </span>
                <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] tabular-nums">
                  {t('forms:registration.boothsTaken', {
                    taken: chosen.taken,
                    capacity: chosen.capacity,
                  })}
                </span>
              </div>
              <div className="mt-3">
                <SegmentBar
                  segments={chosen.capacity}
                  filled={chosen.taken}
                  label={t('forms:registration.boothProgress')}
                  height="h-[18px]"
                />
              </div>
            </div>
          ) : null}

          {sectionHeading(t('portal:you'))}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: t('portal:nationalId'), value: person.national_id },
              { label: t('portal:phone'), value: person.phone ?? '' },
            ].map((f) => (
              <div key={f.label}>
                <div className="mb-[7px] font-narrow text-[12px] font-bold uppercase tracking-[0.12em]">
                  {f.label}
                </div>
                <div className="flex justify-between gap-2.5 border-[1.5px] border-dashed border-border-muted bg-raised px-[13px] py-[11px]">
                  <span className="text-[15px] font-semibold">
                    <BidiIsolate>{f.value}</BidiIsolate>
                  </span>
                  <span className="whitespace-nowrap pt-[3px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
                    {t('portal:fromYourRecord')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {sectionHeading(t('portal:whatBring'))}
          <div className="mt-4 grid grid-cols-12 gap-x-[18px] gap-y-5">
            <Field
              spec={{
                key: 'products',
                label: t('portal:products'),
                type: 'chips',
                required: true,
                accent: 'amber',
                options: productOptions.map((r) => ({ value: r.id, label: refLabel(r, locale) })),
              }}
              value={products}
              onChange={() => undefined}
              onToggle={(v) =>
                setProducts((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
              }
            />
            <Field
              spec={{
                key: 'producerType',
                label: t('portal:producerType'),
                type: 'select',
                placeholder: t('portal:selectOne'),
                options: producerTypeOptions.map((r) => ({
                  value: r.id,
                  label: refLabel(r, locale),
                })),
              }}
              value={producerType}
              onChange={setProducerType}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="min-h-11 cursor-pointer border-[1.5px] border-bg bg-transparent px-[22px] py-[15px] font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="min-h-11 flex-1 cursor-pointer bg-ink px-[22px] py-[15px] font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg"
          >
            {t('portal:submitRegistration')}
          </button>
        </div>
        <p className="mt-3 text-center font-narrow text-[12px] font-semibold uppercase tracking-[0.1em] opacity-75">
          {t('portal:confirmByPhone')}
        </p>
      </main>
    </PortalShell>
  )
}

export default PortalRegister

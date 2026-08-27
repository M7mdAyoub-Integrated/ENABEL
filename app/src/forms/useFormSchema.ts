import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionsForTopic, NEW_SESSION } from '../data/completions'
import type { FieldSpec } from '../ui/Field'
import type { ModuleId } from '../modules'
import { makeTranslate, type Translate } from '../i18n/tx'
import {
  useExhibitionOptions,
  usePartnerOptions,
  useCompletionPeople,
  personByNationalId,
} from '../hooks/useData'
// Reference data now comes from the database, not the mock file. It is shared
// lookup data rather than any one module's records, so it moves once here for
// every form at the same time.
import { refLabel, useRef, type RefRow } from '../data/refTables'

export type FormSection = {
  id: string
  title: string
  pill?: string
  pillAccent?: 'teal' | 'green' | 'amber' | 'slate' | 'ink'
  note?: string
  fields: FieldSpec[]
  /** Booth availability panel, registration form only. */
  booths?: { name: string; taken: number; capacity: number; dates: string; location: string }
}

export type FormValues = Record<string, string | string[] | undefined>

/** Exactly nine digits. Mirrors the DB check constraint on person.national_id. */
export function nationalIdError(
  raw: string | undefined,
  required: boolean,
  t: Translate,
): string {
  const v = (raw ?? '').trim()
  if (!v) return required ? t('validation.nidRequired') : ''
  if (!/^[0-9]+$/.test(v)) return t('validation.nidDigitsOnly')
  if (v.length !== 9) return t('validation.nidLength', { count: v.length })
  return ''
}

export function useFormSchema(
  module: ModuleId,
  values: FormValues,
  touched: boolean,
): FormSection[] {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const tx = useMemo(() => makeTranslate(t), [t])
  const exhibitionOptions = useExhibitionOptions(tx, locale)
  const productionPartners = usePartnerOptions('production_support')
  const completionPeople = useCompletionPeople()
  // Sessions this completion could belong to. Fetched here so the picker can
  // narrow as soon as a topic and date are chosen.
  const tcTopic = typeof values['topic'] === 'string' ? (values['topic'] as string) : ''
  const tcDate = typeof values['date'] === 'string' ? (values['date'] as string) : ''
  const matchingSessions = useSessionsForTopic(tcTopic, tcDate)
  const partnerTypeTraining = useRef('partner_type_training')
  const partnerTypeProduction = useRef('partner_type_production')
  const partnerRoleTraining = useRef('partner_role_training')
  const partnerRoleProduction = useRef('partner_role_production')
  const trainingTopic = useRef('training_topic')
  const agriInvolvement = useRef('agri_involvement')
  const activityType = useRef('activity_type')
  const product = useRef('product')
  const producerType = useRef('producer_type')
  const refs = useMemo(
    () => ({
      partnerTypeTraining, partnerTypeProduction, partnerRoleTraining,
      partnerRoleProduction, trainingTopic, agriInvolvement, activityType,
      product, producerType,
    }),
    [partnerTypeTraining, partnerTypeProduction, partnerRoleTraining,
     partnerRoleProduction, trainingTopic, agriInvolvement, activityType,
     product, producerType],
  )

  return useMemo(() => {
    const opts = (rows: RefRow[]) =>
      rows.map((r) => ({ value: r.id, label: refLabel(r, locale) }))
    const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '')

    // Sessions first, "create a new one" last and labelled. The fallback is a
    // deliberate choice with words on it, never a silent default.
    const sessionOpts = [
      ...(matchingSessions.data ?? []).map((s) => ({
        value: s.id,
        label: `${s.title} · ${s.start_date}${s.end_date !== s.start_date ? ` – ${s.end_date}` : ''}${s.venue ? ` · ${s.venue}` : ''}${s.containsDate ? ` — ${t('forms:completion.coversThisDate')}` : ''}`,
      })),
      { value: NEW_SESSION, label: t('forms:completion.createNewSession') },
    ]

    if (module === 'tp' || module === 'pp') {
      const training = module === 'tp'
      return [
        {
          id: 'identity',
          title: t('forms:partner.identity'),
          fields: [
            { key: 'name', label: t('forms:partner.name'), type: 'text', required: true, placeholder: t('forms:partner.namePh') },
            { key: 'contact', label: t('forms:partner.contact'), type: 'text', half: true },
            { key: 'phone', label: t('forms:partner.phone'), type: 'tel', half: true, ltr: true, placeholder: t('forms:partner.phonePh') },
            { key: 'email', label: t('forms:partner.email'), type: 'email', half: true, ltr: true, placeholder: t('forms:partner.emailPh') },
          ],
        },
        {
          id: 'classification',
          title: t('forms:partner.classification'),
          fields: [
            {
              key: 'type',
              label: t('forms:partner.type'),
              type: 'select',
              options: opts(training ? refs.partnerTypeTraining : refs.partnerTypeProduction),
              help: t('forms:partner.typeHelp'),
            },
          ],
        },
        {
          id: 'role',
          title: training ? t('forms:partner.roleTraining') : t('forms:partner.roleProduction'),
          pill: t('forms:selectAll'),
          pillAccent: training ? 'teal' : 'green',
          fields: [
            {
              key: 'role',
              label: training ? t('forms:partner.roleTraining') : t('forms:partner.roleProduction'),
              type: 'checks',
              twoCol: true,
              accent: training ? 'teal' : 'green',
              options: opts(training ? refs.partnerRoleTraining : refs.partnerRoleProduction),
              help: training ? t('forms:partner.roleHelpTraining') : t('forms:partner.roleHelpProduction'),
            },
          ],
        },
      ]
    }

    if (module === 'tc') {
      const nidErr = touched ? nationalIdError(str('nid'), true, tx) : ''
      const mismatch =
        touched && str('nid2') && str('nid') !== str('nid2') ? t('forms:validation.nidMismatch') : ''
      return [
        {
          id: 'identification',
          title: t('forms:completion.identification'),
          fields: [
            { key: 'nid', label: t('forms:completion.nid'), type: 'text', required: true, half: true, ltr: true, placeholder: t('forms:completion.nidPh'), help: t('forms:completion.nidHelp'), ...(nidErr ? { error: nidErr } : {}) },
            { key: 'nid2', label: t('forms:completion.nidConfirm'), type: 'text', required: true, half: true, ltr: true, placeholder: t('forms:completion.nidConfirmPh'), ...(mismatch ? { error: mismatch } : {}) },
            { key: 'name', label: t('forms:completion.name'), type: 'text', required: true, half: true },
            { key: 'sex', label: t('forms:completion.sex'), type: 'select', half: true, options: [
              { value: 'male', label: t('common:enums.sex.male') },
              { value: 'female', label: t('common:enums.sex.female') },
            ] },
            { key: 'age', label: t('forms:completion.age'), type: 'number', half: true, placeholder: t('forms:completion.agePh') },
            { key: 'phone', label: t('forms:completion.phone'), type: 'tel', half: true, ltr: true, placeholder: t('forms:partner.phonePh') },
          ],
        },
        {
          id: 'training',
          title: t('forms:completion.trainingAttended'),
          fields: [
            { key: 'topic', label: t('forms:completion.trainingTitle'), type: 'select', half: true, options: opts(refs.trainingTopic) },
            { key: 'date', label: t('forms:completion.trainingDate'), type: 'date', half: true },
            // PICK THE SESSION, do not create one silently. Creating a session
            // as a by-product is what produced three rows for one three-day
            // course: resolveSession matched on start_date, so each day was a
            // new session. The picker matches on the whole date range instead.
            {
              key: 'session',
              label: t('forms:completion.session'),
              type: 'select',
              required: true,
              help: sessionOpts.length > 1
                ? t('forms:completion.sessionHelp')
                : t('forms:completion.sessionHelpNone'),
              options: sessionOpts,
              ...(str('session') === NEW_SESSION
                ? { warn: t('forms:completion.willCreateSession') }
                : {}),
            },
          ],
        },
        {
          id: 'profile',
          title: t('forms:completion.agriProfile'),
          fields: [
            { key: 'involve', label: t('forms:completion.involvement'), type: 'select', options: opts(refs.agriInvolvement) },
            { key: 'act', label: t('forms:completion.activityType'), type: 'checks', twoCol: true, accent: 'teal', options: opts(refs.activityType), help: t('forms:selectAllHelp') },
          ],
        },
        {
          id: 'decision',
          title: t('forms:completion.decision'),
          pill: t('forms:completion.countsToward', { code: 'A1.3' }),
          pillAccent: 'teal',
          note: t('forms:completion.decisionNote'),
          fields: [
            { key: 'met', label: t('forms:completion.metCriteria'), type: 'radio', big: true, accent: 'teal', options: [
              { value: 'yes', label: t('common:yes') },
              { value: 'no', label: t('common:no') },
            ] },
          ],
        },
      ]
    }

    if (module === 'ln') {
      const selected = completionPeople.find((p) => p.personId === str('farmer'))
      return [
        {
          id: 'farmer',
          title: t('forms:linkage.farmer'),
          pill: t('forms:pulledFrom'),
          pillAccent: 'teal',
          note: t('forms:linkage.farmerNote'),
          fields: [
            {
              key: 'farmer',
              label: t('forms:linkage.farmer'),
              type: 'select',
              required: true,
              tag: t('forms:linkage.fromCompletion'),
              tagAccent: 'teal',
              options: completionPeople.map((p) => ({ value: p.personId, label: `${p.nationalId} — ${p.name}` })),
              help: t('forms:linkage.farmerHelp'),
              ...(selected && !selected.metCriteria ? { warn: t('forms:linkage.notMetWarning') } : {}),
            },
            { key: '_name', label: t('forms:linkage.name'), type: 'readonly', half: true, text: selected?.name ?? '', note: selected ? t('forms:fromCompletionRecord') : t('forms:selectFarmerFirst') },
            { key: '_phone', label: t('forms:linkage.phone'), type: 'readonly', half: true, ltr: true, text: selected?.phone ?? '', note: selected ? t('forms:fromCompletionRecord') : t('forms:selectFarmerFirst') },
          ],
        },
        {
          id: 'partner',
          title: t('forms:linkage.partnerLinkage'),
          pill: t('forms:pulledFrom'),
          pillAccent: 'green',
          fields: [
            {
              key: 'partner',
              label: t('forms:linkage.partnerName'),
              type: 'select',
              tag: t('forms:linkage.fromSupportPartners'),
              tagAccent: 'green',
              placeholder: t('forms:linkage.partnerPh'),
              options: productionPartners.map((p) => ({ value: p.id, label: p.name })),
              help: t('forms:linkage.partnerHelp', { count: productionPartners.length }),
            },
          ],
        },
        {
          id: 'detail',
          title: t('forms:linkage.detail'),
          fields: [
            { key: 'scope', label: t('forms:linkage.scope'), type: 'area', placeholder: t('forms:linkage.scopePh') },
            { key: 'request', label: t('forms:linkage.request'), type: 'area', placeholder: t('forms:linkage.requestPh') },
          ],
        },
      ]
    }

    if (module === 'ex') {
      return [
        {
          id: 'event',
          title: t('forms:exhibition.event'),
          fields: [
            { key: 'name', label: t('forms:exhibition.name'), type: 'text', required: true },
            { key: 'start', label: t('forms:exhibition.start'), type: 'date', half: true },
            { key: 'end', label: t('forms:exhibition.end'), type: 'date', half: true },
          ],
        },
        {
          id: 'logistics',
          title: t('forms:exhibition.logistics'),
          fields: [
            { key: 'location', label: t('forms:exhibition.location'), type: 'text', half: true, placeholder: t('forms:exhibition.locationPh') },
            { key: 'capacity', label: t('forms:exhibition.capacity'), type: 'number', half: true, placeholder: t('forms:exhibition.capacityPh'), help: t('forms:exhibition.capacityHelp') },
            { key: 'sponsor', label: t('forms:exhibition.sponsor'), type: 'text', placeholder: t('forms:exhibition.sponsorPh'), help: t('common:optional') },
          ],
        },
      ]
    }

    if (module === 'rg') {
      const chosen = exhibitionOptions.find((e) => e.id === str('exhibition'))
      const nid = str('nid').trim()
      const known = personByNationalId(nid)
      const valid = !nationalIdError(nid, false, tx) && nid.length === 9
      const exists = valid && !!known
      const nidErr = touched ? nationalIdError(nid, true, tx) : ''
      const mismatch =
        touched && str('nid2') && nid !== str('nid2') ? t('forms:validation.nidMismatch') : ''

      const boothSection: FormSection = {
        id: 'exhibition',
        title: t('forms:registration.exhibition'),
        pill: t('forms:pulledFrom'),
        pillAccent: 'amber',
        fields: [
          {
            key: 'exhibition',
            label: t('forms:registration.exhibition'),
            type: 'select',
            required: true,
            tag: t('forms:registration.fromExhibitions'),
            tagAccent: 'amber',
            placeholder: t('forms:registration.selectExhibition'),
            options: exhibitionOptions.map((e) => ({ value: e.id, label: e.label, disabled: e.disabled })),
            help: t('forms:registration.exhibitionHelp'),
          },
        ],
        ...(chosen
          ? {
              booths: {
                name: chosen.name,
                taken: chosen.taken,
                capacity: chosen.capacity,
                dates: chosen.dates,
                location: chosen.location,
              },
            }
          : {}),
      }

      return [
        boothSection,
        {
          id: 'lookup',
          title: t('forms:registration.producerLookup'),
          ...(exists
            ? { pill: t('forms:registration.existingProducer'), pillAccent: 'green' as const }
            : valid
              ? { pill: t('forms:registration.newProducer'), pillAccent: 'amber' as const }
              : {}),
          fields: [
            {
              key: 'nid',
              label: t('forms:completion.nid'),
              type: 'text',
              required: true,
              half: true,
              ltr: true,
              placeholder: t('forms:completion.nidPh'),
              help: exists
                ? t('forms:registration.existingHelp')
                : valid
                  ? t('forms:registration.newHelp')
                  : t('forms:registration.lookupHelp'),
              ...(nidErr ? { error: nidErr } : {}),
            },
            { key: 'nid2', label: t('forms:completion.nidConfirm'), type: 'text', required: true, half: true, ltr: true, placeholder: t('forms:completion.nidConfirmPh'), ...(mismatch ? { error: mismatch } : {}) },
            exists
              ? { key: 'name', label: t('forms:registration.participantName'), type: 'readonly', half: true, text: known.full_name, note: t('forms:fromProducerRecord') }
              : { key: 'name', label: t('forms:registration.participantName'), type: 'text', half: true },
            exists
              ? { key: 'phone', label: t('forms:completion.phone'), type: 'readonly', half: true, ltr: true, text: known.phone ?? '', note: t('forms:fromProducerRecord') }
              : { key: 'phone', label: t('forms:completion.phone'), type: 'tel', half: true, ltr: true, placeholder: t('forms:partner.phonePh') },
          ],
        },
        {
          id: 'production',
          title: t('forms:registration.productionProfile'),
          fields: [
            { key: 'products', label: t('forms:registration.products'), type: 'chips', accent: 'amber', options: opts(refs.product), help: t('forms:selectAllHelp') },
            { key: 'producerType', label: t('forms:registration.producerType'), type: 'select', options: opts(refs.producerType) },
            { key: 'firstTime', label: t('forms:registration.firstTime'), type: 'radio', accent: 'amber', options: [
              { value: 'yes', label: t('common:yes') },
              { value: 'no', label: t('common:no') },
            ] },
          ],
        },
      ]
    }

    // fu handled by useWizardSteps
    return []
  }, [
    module, values, touched, t, tx, locale,
    exhibitionOptions, productionPartners, completionPeople, refs,
    // The session picker's options come from this query, so the schema has to
    // rebuild when it resolves -- otherwise the field renders with only
    // "create a new session" and a coordinator creates one that already exists.
    matchingSessions.data,
  ])
}

/* ── the six-step follow-up wizard ──────────────────────────────────────── */

export const WIZARD_STEP_COUNT = 6

export function useWizardSteps(values: FormValues, step: number): FormSection[] {
  const { t, i18n } = useTranslation(['survey', 'forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const completionPeople = useCompletionPeople()
  const activityTypes = useRef('activity_type')
  const trainingTopics = useRef('training_topic')

  return useMemo(() => {
    const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '')

    const opts = (rows: RefRow[]) => rows.map((r) => ({ value: r.id, label: refLabel(r, locale) }))
    const person = completionPeople.find((p) => p.personId === str('person'))
    const isTwelveMonth = str('round') === 'twelve_month'

    const yesNo = [
      { value: 'yes', label: t('common:yes') },
      { value: 'no', label: t('common:no') },
    ]

    if (step === 0) {
      return [
        {
          id: 'respondent',
          title: t('survey:s0.title'),
          pill: t('survey:s0.questions'),
          pillAccent: 'ink',
          fields: [
            {
              key: 'person',
              label: t('survey:s0.nationalId'),
              type: 'select',
              required: true,
              tag: t('forms:linkage.fromCompletion'),
              tagAccent: 'teal',
              options: completionPeople.map((p) => ({ value: p.personId, label: `${p.nationalId} — ${p.name}` })),
              help: t('survey:s0.nationalIdHelp'),
            },
            { key: 'respondent', label: t('survey:s0.isRegistered'), type: 'select', half: true, options: [
              { value: 'participant', label: t('common:enums.respondent.participant') },
              { value: 'household_member', label: t('common:enums.respondent.household_member') },
              { value: 'not_reached', label: t('common:enums.respondent.not_reached') },
            ] },
            { key: 'round', label: t('survey:s0.round'), type: 'select', half: true, options: [
              { value: 'six_month', label: t('common:enums.round.six_month') },
              { value: 'twelve_month', label: t('common:enums.round.twelve_month') },
              { value: 'annual', label: t('common:enums.round.annual') },
            ], help: t('survey:s0.roundHelp') },
            { key: 'contactDate', label: t('survey:s0.contactDate'), type: 'date', half: true },
            { key: 'mode', label: t('survey:s0.mode'), type: 'select', half: true, options: [
              { value: 'telephone', label: t('common:enums.mode.telephone') },
              { value: 'site_visit', label: t('common:enums.mode.site_visit') },
              { value: 'municipal_office', label: t('common:enums.mode.municipal_office') },
            ] },
            { key: 'enumerator', label: t('survey:s0.enumerator'), type: 'text', half: true },
          ],
        },
        {
          id: 'support',
          title: t('survey:s0.supportTitle'),
          pill: person ? t('survey:s0.prefilled') : t('survey:s0.awaiting'),
          pillAccent: person ? 'green' : 'slate',
          note: person ? t('survey:s0.supportNote', { name: person.name }) : t('survey:s0.supportEmpty'),
          fields: [
            {
              key: 'support',
              label: t('survey:s0.supportReceived'),
              type: 'checks',
              twoCol: true,
              accent: 'green',
              disabled: !person,
              options: [
                { value: 'training', label: t('survey:support.training') },
                { value: 'advisory', label: t('survey:support.advisory') },
                { value: 'linkage', label: t('survey:support.linkage') },
                { value: 'exhibition', label: t('survey:support.exhibition') },
                { value: 'guidance', label: t('survey:support.guidance') },
                { value: 'referral', label: t('survey:support.referral') },
              ],
              ...(person ? { help: t('survey:s0.supportHelp') } : {}),
            },
            {
              key: '_trainings',
              label: t('survey:s0.trainings'),
              type: 'readonly',
              text: person ? `${refLabel(trainingTopics.find((r) => r.id === person.topicId), locale)} · ${person.date}` : '',
              note: person ? t('forms:fromCompletionRecord') : t('survey:s0.noRespondent'),
              help: t('survey:s0.trainingsHelp'),
            },
          ],
        },
      ]
    }

    if (step === 1) {
      return [
        {
          id: 'sectionA',
          title: t('survey:s1.title'),
          pill: t('survey:s1.questions'),
          pillAccent: 'teal',
          fields: [
            { key: 'q07', label: t('survey:q07'), type: 'radio', accent: 'teal', options: [
              { value: 'very', label: t('survey:opt.veryRelevant') },
              { value: 'somewhat', label: t('survey:opt.somewhatRelevant') },
              { value: 'not_very', label: t('survey:opt.notVeryRelevant') },
              { value: 'not_at_all', label: t('survey:opt.notAtAllRelevant') },
            ] },
            { key: 'q08', label: t('survey:q08'), type: 'radio', accent: 'teal', options: [
              { value: 'regularly', label: t('survey:opt.yesRegularly') },
              { value: 'occasionally', label: t('survey:opt.yesOccasionally') },
              { value: 'no', label: t('common:no') },
            ] },
            { key: 'q09', label: t('survey:q09'), type: 'checks', twoCol: true, accent: 'teal', options: [
              { value: 'funds', label: t('survey:opt.noFunds') },
              { value: 'equipment', label: t('survey:opt.noEquipment') },
              { value: 'land', label: t('survey:opt.noLand') },
              { value: 'market', label: t('survey:opt.noMarket') },
              { value: 'time', label: t('survey:opt.noTime') },
              { value: 'relevance', label: t('survey:opt.notRelevant') },
            ], help: t('survey:q09Help') },
          ],
        },
        {
          id: 'sectionA2',
          title: t('survey:s1.office'),
          fields: [
            { key: 'q14', label: t('survey:q14'), type: 'radio', accent: 'teal', options: [
              ...yesNo,
              { value: 'unaware', label: t('survey:opt.notAware') },
            ] },
            { key: 'q16', label: t('survey:q16'), type: 'radio', accent: 'teal', options: [
              { value: 'very', label: t('survey:opt.veryUseful') },
              { value: 'somewhat', label: t('survey:opt.somewhatUseful') },
              { value: 'not_very', label: t('survey:opt.notVeryUseful') },
              { value: 'not_at_all', label: t('survey:opt.notAtAllUseful') },
            ] },
          ],
        },
      ]
    }

    if (step === 2) {
      return [
        {
          id: 'sectionB',
          title: t('survey:s2.title'),
          pill: t('survey:s2.questions'),
          pillAccent: 'green',
          fields: [
            { key: 'q17', label: t('survey:q17'), type: 'radio', accent: 'green', options: [
              { value: 'expanded', label: t('survey:opt.expanded') },
              { value: 'same', label: t('survey:opt.same') },
              { value: 'reduced', label: t('survey:opt.reduced') },
              { value: 'paused', label: t('survey:opt.paused') },
              { value: 'stopped', label: t('survey:opt.stopped') },
              { value: 'never_started', label: t('survey:opt.neverStarted') },
            ] },
            { key: 'q18', label: t('survey:q18'), type: 'radio', accent: 'green', options: [
              { value: 'after', label: t('survey:opt.startedAfter') },
              { value: 'before_strengthened', label: t('survey:opt.existedStrengthened') },
              { value: 'before_nochange', label: t('survey:opt.existedNoChange') },
            ] },
            { key: 'q20', label: t('survey:q20'), type: 'select', options: opts(activityTypes) },
            { key: 'q22', label: t('survey:q22'), type: 'radio', accent: 'green', options: [
              { value: 'much_more', label: t('survey:opt.muchMore') },
              { value: 'somewhat_more', label: t('survey:opt.somewhatMore') },
              { value: 'same', label: t('survey:opt.aboutSame') },
              { value: 'less', label: t('survey:opt.less') },
              { value: 'none', label: t('survey:opt.notProducing') },
            ] },
          ],
        },
        {
          id: 'workers',
          title: t('survey:s2.workers'),
          fields: [
            { key: 'q26total', label: t('survey:q26total'), type: 'number', half: true },
            { key: 'q26women', label: t('survey:q26women'), type: 'number', half: true },
            { key: 'q26under30', label: t('survey:q26under30'), type: 'number', half: true },
          ],
        },
      ]
    }

    if (step === 3) {
      return [
        {
          id: 'sectionC',
          title: t('survey:s3.title'),
          pill: t('survey:s3.questions'),
          pillAccent: 'amber',
          fields: [
            { key: 'q27', label: t('survey:q27'), type: 'checks', twoCol: true, accent: 'amber', options: [
              { value: 'not_selling', label: t('survey:opt.notSelling') },
              { value: 'neighbours', label: t('survey:opt.neighbours') },
              { value: 'from_home', label: t('survey:opt.fromHome') },
              { value: 'municipal_market', label: t('survey:opt.municipalMarket') },
              { value: 'local_shops', label: t('survey:opt.localShops') },
              { value: 'wholesaler', label: t('survey:opt.wholesaler') },
              { value: 'processor', label: t('survey:opt.processor') },
              { value: 'cooperative', label: t('survey:opt.cooperative') },
              { value: 'online', label: t('survey:opt.online') },
              { value: 'outside', label: t('survey:opt.outsideGovernorate') },
            ] },
            { key: 'q29', label: t('survey:q29'), type: 'radio', accent: 'amber', options: [
              { value: 'much_more', label: t('survey:opt.muchMore') },
              { value: 'somewhat_more', label: t('survey:opt.somewhatMore') },
              { value: 'same', label: t('survey:opt.aboutSame') },
              { value: 'less', label: t('survey:opt.less') },
              { value: 'not_selling', label: t('survey:opt.notSelling') },
            ] },
            { key: 'q31', label: t('survey:q31'), type: 'select', options: [
              { value: 'u50', label: t('survey:opt.under50') },
              { value: '50_150', label: t('survey:opt.band50150') },
              { value: '151_300', label: t('survey:opt.band151300') },
              { value: '301_500', label: t('survey:opt.band301500') },
              { value: 'o500', label: t('survey:opt.over500') },
              { value: 'refused', label: t('survey:opt.preferNotToSay') },
            ] },
          ],
        },
      ]
    }

    if (step === 4) {
      return [
        {
          id: 'buyers',
          title: t('survey:s4.title'),
          pill: t('survey:s4.questions'),
          pillAccent: 'amber',
          note: t('survey:s4.note'),
          fields: [
            { key: 'q34', label: t('survey:q34'), type: 'radio', accent: 'amber', options: [
              ...yesNo,
              { value: 'no_sale', label: t('survey:opt.connectionNoSale') },
            ] },
          ],
        },
      ]
    }

    // step 5 -- Section D is twelve-month only, then closing
    const sections: FormSection[] = []
    if (isTwelveMonth) {
      sections.push({
        id: 'sectionD',
        title: t('survey:s5.title'),
        pill: t('survey:s5.twelveOnly'),
        pillAccent: 'ink',
        note: t('survey:s5.note'),
        fields: [
          { key: 'q37', label: t('survey:q37'), type: 'radio', accent: 'ink', options: [
            { value: 'main', label: t('survey:opt.mainActivity') },
            { value: 'secondary', label: t('survey:opt.secondaryActivity') },
            { value: 'no', label: t('common:no') },
          ] },
          { key: 'q38', label: t('survey:q38'), type: 'select', options: [
            { value: 'own_land', label: t('survey:opt.ownLand') },
            { value: 'rented_land', label: t('survey:opt.rentedLand') },
            { value: 'own_business', label: t('survey:opt.ownBusiness') },
            { value: 'employed', label: t('survey:opt.employed') },
            { value: 'family', label: t('survey:opt.familyActivity') },
            { value: 'not_engaged', label: t('survey:opt.notEngaged') },
          ] },
          { key: 'q40', label: t('survey:q40'), type: 'radio', accent: 'ink', options: [
            { value: 'higher', label: t('survey:opt.higher') },
            { value: 'same', label: t('survey:opt.aboutSame') },
            { value: 'lower', label: t('survey:opt.lower') },
            { value: 'none', label: t('survey:opt.noIncome') },
          ] },
        ],
      })
    }
    sections.push({
      id: 'closing',
      title: t('survey:s6.title'),
      pill: t('survey:s6.questions'),
      pillAccent: 'slate',
      ...(isTwelveMonth ? {} : { note: t('survey:s5.skipped') }),
      fields: [
        { key: 'q41', label: t('survey:q41'), type: 'checks', twoCol: true, accent: 'slate', options: [
          { value: 'training', label: t('survey:opt.moreTraining') },
          { value: 'licensing', label: t('survey:opt.licensingHelp') },
          { value: 'equipment', label: t('survey:opt.equipment') },
          { value: 'finance', label: t('survey:opt.finance') },
          { value: 'buyers', label: t('survey:opt.findBuyers') },
          { value: 'exhibitions', label: t('survey:opt.moreExhibitions') },
        ] },
        { key: 'q42', label: t('survey:q42'), type: 'radio', accent: 'slate', options: yesNo },
        { key: 'q43', label: t('survey:q43'), type: 'area', placeholder: t('survey:q43Ph') },
      ],
    })
    return sections
  }, [values, step, t, locale, completionPeople, activityTypes, trainingTopics])
}

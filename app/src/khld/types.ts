/**
 * The shape of a Khalidiyah form definition, as generated into
 * forms.generated.ts by supabase/khalidiyah/gen_forms.py from the catalogue.
 *
 * Labels are NOT here: they live in locales/{en,ar}/khld.json under
 * forms.<id>.fields.<key>, verbatim from the sheets in both languages, and
 * option labels are ref_khld_* rows in the database. A definition is
 * structure only: which column, junction question, count list, checklist
 * item or child block a control writes, in the terms save_khld_record (0148)
 * accepts.
 */
export type KhldPartType =
  | 'text' | 'number' | 'money' | 'date' | 'phone' | 'select' | 'multi' | 'bool' | 'record' | 'person_phone'

export type KhldPartDef = {
  column: string
  type: KhldPartType
  required?: boolean
  /** A select or multi part: the ref_khld_ list it reads. */
  ref?: string
  /** A select part whose list has a free-text option: the `_other` column. */
  other?: string
  /** A multi part: the question_code its option rows carry. */
  question?: string
  /** A record part: the table it points at. */
  table?: string
  /** A bool part: 'true' and 'false', labelled by partOpts in the locale. */
  options?: readonly string[]
}

export type KhldFieldType =
  /** The person spine (plan §2): the identifier is national ID or UNHCR number, chosen explicitly. */
  | 'ident' | 'person_name' | 'person_sex' | 'person_phone' | 'dob' | 'dob_age'
  /** One column. */
  | 'text' | 'area' | 'number' | 'money' | 'date' | 'month' | 'bool' | 'select'
  /** An option junction row per tick. */
  | 'multi'
  /** A picker over another Khalidiyah table (a foreign key). */
  | 'record'
  /** Derived by the database or shown from a linked record: never accepted. */
  | 'readonly'
  /** Several columns under one sheet row. */
  | 'parts'
  /** A count row per cell of a "by ..." field. */
  | 'counts'
  /** One row of a milestone's checklist (status, detail, date, evidence reference). */
  | 'checklist'
  /** SO2-0's facility matrix: a rating row per item. */
  | 'rating'
  /** One of SO4-G1's five core sessions: attendance status and date. */
  | 'session'
  /** The volunteers present at an occasion: khld_volunteer_participation rows, merged by volunteer. */
  | 'participants'
  /** SO3-0's read-only log of one volunteer's participations. */
  | 'participation_log'

export type KhldFieldDef = {
  key: string
  type: KhldFieldType
  required?: boolean
  /** The sheet's count gate: this field decides whether the record counts (plan §5.3). */
  counting?: boolean
  /** A readonly field: what the database assigns or works out, or which linked record's column is shown. */
  derived?: string
  /** The column a single-column field writes (`<key>` or `<key>_id`), or a record picker's foreign key. */
  column?: string
  /** The ref_khld_ list a select / multi / checklist / counts / session field reads. */
  ref?: string
  /** A select whose list has a free-text option: the `_other` column. */
  other?: string
  /** A multi field: the question_code its option rows carry (form-prefixed on the shared milestone table). */
  question?: string
  /** A counts field: the field_code its count rows carry. */
  fieldCode?: string
  /** A record picker: the table it lists. */
  table?: string
  /** A record picker that may also create the entity (partner, enterprise). */
  create?: boolean
  /** A bool field: the options the sheet offers ('true' and 'false', or 'true' alone). */
  options?: readonly string[]
  /** A bool or select the database stamps with who recorded it and when (consent). */
  stamp?: boolean
  /** A consent that must be true for the record to be saved (a constraint, not a screen rule). */
  mustBeTrue?: boolean
  /** A checklist row: its item number on the milestone and the option codes that take a detail text. */
  itemNo?: number
  detail?: readonly string[]
  /** A rating field: the item list and the rating list. */
  items?: string
  ratings?: string
  /** A session field: its number, its date column, and whether "not applicable" is one of its answers. */
  n?: number
  dateColumn?: string
  na?: boolean
  parts?: readonly KhldPartDef[]
}

export type KhldSectionDef = { key: string; fields: readonly KhldFieldDef[] }

/** The five identity classes of plan §5.1. */
export type KhldClass = 'anonymous' | 'organisation' | 'record' | 'aggregate' | 'linked' | 'person'

export type KhldFormDef = {
  id: string
  /** The framework code, `KHLD-SO1-A2`. */
  code: string
  /** The indicator's short code as `indicator.code` carries it, `SO1-A2`. */
  indicator: string
  sheet: string
  table: KhldTable
  cls: KhldClass
  /** The four milestone forms share one table; this says which milestone. */
  milestone?: string
  /** The reference prefix the database issues on save (`KHLD-CM`), when the table has one. */
  reference?: string
  /** Columns set on every new record (the milestone code). */
  fixed: Readonly<Record<string, string>>
  /** Columns the list filters on (the same). */
  filter: Readonly<Record<string, string>>
  sections: readonly KhldSectionDef[]
}

/** The 22 tables save_khld_record accepts (0148), entities included. */
export type KhldTable =
  | 'khld_partner' | 'khld_enterprise' | 'khld_vendor'
  | 'khld_works_item' | 'khld_coordination_meeting' | 'khld_contribution' | 'khld_campaign' | 'khld_activity'
  | 'khld_market' | 'khld_action_day' | 'khld_volunteer' | 'khld_attendance' | 'khld_guidance_completion'
  | 'khld_enterprise_support' | 'khld_vendor_registration' | 'khld_interaction_survey' | 'khld_partner_survey'
  | 'khld_user_feedback' | 'khld_volunteer_tracking' | 'khld_producer_survey' | 'khld_milestone_verification'
  | 'khld_volunteer_participation'

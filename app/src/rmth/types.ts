/**
 * The shape of a Ramtha form definition, as generated into forms.generated.ts
 * from supabase/ramtha/forms.py. Labels are NOT here: they live in
 * locales/{en,ar}/rmth.json under forms.<id>.fields.<key>, English verbatim
 * from the sheet, so a definition is structure only.
 */
export type RmthPartType =
  | 'text' | 'number' | 'date' | 'month' | 'phone' | 'select' | 'multi' | 'bool' | 'record'

export type RmthPartDef = {
  column: string
  type: RmthPartType
  required?: boolean
  ref?: string
  other?: string
  question?: string
  options?: readonly string[]
  table?: string
  kind?: Readonly<Record<string, string>>
  create?: boolean
  step?: string
}

export type RmthFieldType =
  | 'nid' | 'nid_confirm' | 'person_name' | 'person_phone' | 'person_sex' | 'age'
  | 'text' | 'area' | 'number' | 'date' | 'month' | 'phone'
  | 'select' | 'multi' | 'bool' | 'record' | 'records' | 'parts'
  | 'grid' | 'services' | 'deliveries' | 'readonly'

export type RmthFieldDef = {
  key: string
  type: RmthFieldType
  required?: boolean
  /** The sheet says in capitals that this field produces the indicator count. */
  counting?: boolean
  /** A readonly field the database assigns or works out. */
  derived?: string
  ref?: string
  other?: string
  question?: string
  options?: readonly string[]
  table?: string
  kind?: Readonly<Record<string, string>>
  payload?: string
  components?: string
  ratings?: string
  services?: string
  create?: boolean
  /** The rmth_threshold key whose rule this decision follows. */
  rule?: string
  /** A single date that also fills this column (a session is one day). */
  mirror?: string
  step?: string
  unit?: string
  max?: number
  parts?: readonly RmthPartDef[]
}

export type RmthSectionDef = { key: string; fields: readonly RmthFieldDef[] }

export type RmthFormDef = {
  id: string
  indicator: string
  sheet: string
  table: RmthTable
  /** Columns set on every new record (the kind the form belongs to). */
  fixed: Readonly<Record<string, string>>
  /** Columns the list filters on (the same kind). */
  filter: Readonly<Record<string, string>>
  sections: readonly RmthSectionDef[]
}

export type RmthTable =
  | 'rmth_event' | 'rmth_proposal' | 'rmth_training_programme' | 'rmth_training_cycle'
  | 'rmth_training_enrolment' | 'rmth_project_implementer' | 'rmth_incubator'
  | 'rmth_enterprise' | 'rmth_incubation_service' | 'rmth_outcome_survey'

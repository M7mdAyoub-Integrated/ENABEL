/**
 * The shape of a Ramtha form definition, as generated into forms.generated.ts
 * by supabase/ramtha/gen_forms.py from RMTH_Forms_and_Calculations_v2.xlsx and
 * the catalogue.
 *
 * Labels are NOT here: they live in locales/{en,ar}/rmth.json under
 * forms.<id>.fields.<Field ID>, the sheet's own words in both languages, and
 * option labels are ref_rmth_* rows in the database (0176). A definition is
 * structure only: which column, junction question or person field a control
 * writes, in the terms save_rmth_record (0178) accepts.
 */

/** What a field is (supabase/ramtha/catalogue.py says the same, at more length). */
export type RmthKind =
  /** FORM-01's person block: `person`, one row per person, found by national ID. */
  | 'ident' | 'person_name' | 'person_sex'
  /** One column. */
  | 'int' | 'number' | 'select' | 'bool' | 'text' | 'date'
  /** Set by the database: PR-04 (the age group), PJ-01 / AC-01 (the ID issued), IS-03 (the moment of saving). */
  | 'calc' | 'reference' | 'stamp'
  /** A rmth_<table>_option row per tick; the question is the Field ID in lower case without the dash. */
  | 'multi'
  /** A picker over another Ramtha table (a composite foreign key). */
  | 'record'
  /** A person from the Person Register (FORM-01): "prepopulated <PR-01>". */
  | 'person'

/**
 * When a field is asked. Every condition must hold:
 *   values            the governing select's chosen option is one of these codes;
 *                     a multi's ticks include one of them
 *   via 'category'    the ACTIVITY the governing record field picked has one of these categories
 *   answered          the governing field has an answer
 * A field whose condition does not hold is dimmed and sent blank; the
 * database refuses a stray value (0177's guards, 0178's rules over ticks).
 */
export type RmthCond = {
  readonly field: string
  readonly values?: readonly string[]
  readonly via?: 'category'
  readonly answered?: boolean
}

export type RmthFieldDef = {
  readonly id: string
  readonly kind: RmthKind
  /** The column a one-column field writes. */
  readonly column?: string
  readonly required?: boolean
  readonly when?: readonly RmthCond[]
  /** The ref_rmth_ list a select, multi, sex or age group reads. */
  readonly list?: string
  /** A select whose list has a free-text option: the `_other` column. */
  readonly other?: string
  /** A multi: the question_code its option rows carry. */
  readonly question?: string
  /** A multi: the option code that cannot be ticked with another ("None"). */
  readonly exclusive?: string
  /** A record picker: the table it lists. */
  readonly table?: string
  /** A record picker over activities: only these categories (FB-01). */
  readonly categories?: readonly string[]
  readonly min?: number
  readonly max?: number
  /** PR-03: not after the current year. */
  readonly maxCurrentYear?: boolean
  /** PJ-02, PA-06, FU-02: not after today. */
  readonly notFuture?: boolean
  /** AC-05: not before this field's date. */
  readonly notBefore?: string
  /** FU-04, FU-07: not after this field's date. */
  readonly notAfter?: string
  /** AC-09, AC-11: more than zero. */
  readonly positive?: boolean
  /** PR-06 and PR-07: added by the owner on 1 October 2026, not in the sheet. */
  readonly added?: boolean
}

export type RmthFormDef = {
  readonly id: string
  /** The sheet's Form ID: FORM-01 .. FORM-07. */
  readonly sheet: string
  readonly table: RmthTable
  /** The workbook's page (Page En), as a key: the sidebar group. */
  readonly group: string
  /** The RLS helper that may write: can_write, or is_staff for the three surveys. */
  readonly writer: 'can_write' | 'is_staff'
  /** The prefix of the ID the database issues on save (RMTH-PP-001). */
  readonly reference?: string
  /** FORM-03: a coordinator publishes the activity on the public page. */
  readonly published?: boolean
  /** The indicators the sheet says this form feeds (full codes). */
  readonly indicators: readonly string[]
  /** The fields the list screen shows as columns. */
  readonly list: readonly string[]
  readonly fields: readonly RmthFieldDef[]
}

/** The seven tables save_rmth_record accepts (0178). */
export type RmthTable =
  | 'rmth_beneficiary' | 'rmth_project' | 'rmth_activity' | 'rmth_participation'
  | 'rmth_feedback' | 'rmth_followup' | 'rmth_implementer_survey'

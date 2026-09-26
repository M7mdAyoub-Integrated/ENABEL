/**
 * The shape of a Khalidiyah form definition, as generated into
 * forms.generated.ts by supabase/khalidiyah/gen_forms.py from the catalogue.
 *
 * Labels are NOT here: they live in locales/{en,ar}/khld.json under
 * forms.<id>.fields.<Field ID>, verbatim from Khaldia_2_reviewed.xlsx in both
 * languages, and option labels are ref_khld_* rows in the database. A
 * definition is structure only: which column, question or junction a control
 * writes, in the terms save_khld_record (0161) accepts.
 */

/** What a field is (supabase/khalidiyah/catalogue.py says the same, at more length). */
export type KhldKind =
  /** One column. */
  | 'text' | 'area' | 'int' | 'money' | 'percent' | 'date' | 'bool' | 'select' | 'likert'
  /** Set by the database: F012 and F159's moment of saving, a KHLD-XXX reference. */
  | 'stamp' | 'reference'
  /** A khld_<table>_option row per tick; the question is the Field ID in lower case. */
  | 'multi'
  /** Evidence on the record under this Field ID (attachment.field_code, 0158). */
  | 'file'
  /** A picker over another Khalidiyah table (a foreign key). */
  | 'record'
  /** Several partners: a junction (F118, F131). */
  | 'records'
  /** FORM-13 F147: one campaign (FORM-07) or one activity (FORM-08), two columns. */
  | 'occasion'
  /** A person picked from another form's registrations (F112, F197, F206). */
  | 'person_ref'
  /** The identifier block of FORM-12, -15 and -17: `person`, one row per person. */
  | 'id_type' | 'ident' | 'person_name' | 'person_sex' | 'dob' | 'person_phone'
  /** The name of the person another field picked, never typed (F069, F111). */
  | 'shown'

/**
 * A control that belongs to answers of another control on the same form. A
 * select's values are option CODES; a bool's are 'true' / 'false'; a
 * record's are '__extra__' (the added option: "Other", "General park visit")
 * or '__record__' (a real row). Every condition of the list must hold. The
 * screens dim and blank a control whose answer is not chosen; the rules that
 * REFUSE are khld_field_rule rows in the database (0158).
 */
export type KhldCond = { readonly field: string; readonly values: readonly string[] }

export type KhldFieldDef = {
  readonly id: string
  readonly kind: KhldKind
  /** The column a one-column field writes. */
  readonly column?: string
  readonly required?: boolean
  readonly when?: readonly KhldCond[]
  /** The ref_khld_ list a select, multi, ID type or sex reads. */
  readonly list?: string
  /** A select whose list has a free-text option: the `_other` column. */
  readonly other?: string
  /** A multi: the question_code its option rows carry. */
  readonly question?: string
  /** A likert: which 1-5 wording (the labels are the field's `opts` in the locale). */
  readonly scale?: string
  /** A record or records picker: the table it lists. A person_ref: the table whose people it lists. */
  readonly table?: string
  /** A record picker: the two date columns of the target between which it is open today. */
  readonly window?: readonly string[]
  /** A record picker's added option; `column` is the boolean it sets, when it has one. */
  readonly extra?: { readonly code: string; readonly column?: string }
  /** F174: partners whose outreach confirmed the partnership (F116). */
  readonly confirmed?: boolean
  /** F207: markets whose status is Held. */
  readonly held?: boolean
  readonly maxFiles?: number
  /** A shown field: the field whose record it names. */
  readonly of?: string
  readonly ltr?: boolean
  readonly min?: number
  readonly max?: number
  /** F060 "if no then disqualified": a CHECK in the database. */
  readonly mustBeTrue?: boolean
}

export type KhldFormDef = {
  readonly id: string
  /** The Form ID(s) of the sheet: FORM-03 and FORM-04 are one form. */
  readonly sheets: readonly string[]
  readonly table: KhldTable
  readonly group: string
  /** The RLS helper that may write: can_write, or is_staff for the three questionnaires. */
  readonly writer: 'can_write' | 'is_staff'
  /** The reference prefix the database issues on save (`KHLD-MTG`), when the table has one. */
  readonly reference?: string
  /** Activities and markets: published on the public page by a coordinator. */
  readonly published?: boolean
  /** FORM-12: also filled in by the public, and reviewed. */
  readonly public?: boolean
  /** The indicators the sheet says this form feeds (full codes). */
  readonly indicators: readonly string[]
  /** The fields the list screen shows as columns. */
  readonly list: readonly string[]
  readonly fields: readonly KhldFieldDef[]
}

/** The 23 tables save_khld_record accepts (0161). */
export type KhldTable =
  | 'khld_focal_point' | 'khld_partner' | 'khld_partner_contact' | 'khld_meeting' | 'khld_rehab_report'
  | 'khld_campaign' | 'khld_activity' | 'khld_activity_attendance' | 'khld_committee_member'
  | 'khld_committee_meeting' | 'khld_volunteer' | 'khld_volunteer_attendance' | 'khld_guidance_session'
  | 'khld_enterprise_request' | 'khld_market' | 'khld_vendor_application' | 'khld_market_attendance'
  | 'khld_park_survey' | 'khld_partner_survey' | 'khld_contribution' | 'khld_milestone_record'
  | 'khld_enterprise_support' | 'khld_producer_survey'

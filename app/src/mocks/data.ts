/**
 * The ONLY mock data in the app.
 *
 * Rows are shaped to `src/types/database.ts` -- real column names, real enum
 * values, real id/foreign-key relationships. That is the whole point: in Phase 4
 * the swap happens inside `src/hooks/*`, and nothing in a component changes,
 * because components already consume DB-shaped rows.
 *
 * No component imports this file. Hooks do. See src/hooks/useModules.ts.
 */
import type { Database } from '../types/database'

type T = Database['public']['Tables']
export type Person = T['person']['Row']
export type Partner = T['partner']['Row']
export type Partnership = T['partnership']['Row']
export type TrainingSession = T['training_session']['Row']
export type TrainingEnrolment = T['training_enrolment']['Row']
export type Exhibition = T['exhibition']['Row']
export type ExhibitionRegistration = T['exhibition_registration']['Row']
export type MarketLinkage = T['market_linkage']['Row']
export type FollowupSurvey = T['followup_survey']['Row']

/** The prototype pins "today" so held/upcoming states are deterministic. */
export const TODAY = new Date('2026-08-23T00:00:00Z')

const base = (id: string, at: string) => ({
  id,
  created_at: at,
  updated_at: at,
  created_by: null,
  deleted_at: null,
})

/* ── reference lookups ──────────────────────────────────────────────────────
   These mirror ref_* tables. `label_ar` is null across the board, exactly as in
   the database -- which is what makes the label_ar fallback path real rather
   than theoretical. See useRefLabel().                                        */
export type RefRow = { id: string; code: string; label_en: string; label_ar: string | null }

const ref = (id: string, code: string, en: string): RefRow => ({
  id,
  code,
  label_en: en,
  label_ar: null,
})

export const REF_PARTNER_TYPE_TRAINING: RefRow[] = [
  ref('rtt1', 'government', 'Government institution (national or local)'),
  ref('rtt2', 'public_training_institute', 'Public training institute or extension service'),
  ref('rtt3', 'university', 'University or academic institution'),
  ref('rtt4', 'private_sector', 'Private sector company'),
  ref('rtt5', 'ngo_cso', 'NGO or civil society organisation'),
  ref('rtt6', 'international_org', 'International organisation or development partner'),
  ref('rtt7', 'financial_institution', 'Financial institution'),
  ref('rtt8', 'other', 'Other (please specify)'),
]

export const REF_PARTNER_ROLE_TRAINING: RefRow[] = [
  ref('rrt1', 'training_delivery', 'Training delivery'),
  ref('rrt2', 'curriculum_development', 'Curriculum development and accreditation'),
  ref('rrt3', 'funding', 'Funding or financial support'),
  ref('rrt4', 'market_linkage_jobs', 'Market linkage or job placement'),
  ref('rrt5', 'input_provision', 'Input provision (seeds, equipment, technology)'),
  ref('rrt6', 'community_outreach', 'Community outreach and participant mobilisation'),
  ref('rrt7', 'technical_advisory', 'Technical advisory and extension services'),
  ref('rrt8', 'mel_support', 'Monitoring, evaluation and learning support'),
  ref('rrt9', 'logistics', 'Logistics and operational support (venues, transport)'),
  ref('rrt10', 'financial_services', 'Financial services (loans, grants to beneficiaries)'),
  ref('rrt11', 'policy_support', 'Policy or regulatory support'),
  ref('rrt12', 'other', 'Other (please specify)'),
]

export const REF_PARTNER_TYPE_PRODUCTION: RefRow[] = [
  ref('rtp1', 'government', 'Government institution'),
  ref('rtp2', 'technical_institution', 'Technical institution or research centre'),
  ref('rtp3', 'food_processing_facility', 'Food processing facility or agro-processing company'),
  ref('rtp4', 'private_sector', 'Private sector company (input supplier, trader, agribusiness)'),
  ref('rtp5', 'financial_institution', 'Financial institution'),
  ref('rtp6', 'ngo_cso', 'NGO or civil society organisation'),
  ref('rtp7', 'international_org', 'International organisation or development partner'),
  ref('rtp8', 'university', 'University'),
  ref('rtp9', 'other', 'Other (please specify)'),
]

export const REF_PARTNER_ROLE_PRODUCTION: RefRow[] = [
  ref('rrp1', 'technical_advisory', 'Technical advisory and extension services'),
  ref('rrp2', 'input_provision', 'Input provision (seeds, fertiliser, equipment)'),
  ref('rrp3', 'processing_value_addition', 'Processing or value addition support'),
  ref('rrp4', 'market_linkage_buyers', 'Market linkage and buyer connections'),
  ref('rrp5', 'quality_standards', 'Quality standards, certification or food safety'),
  ref('rrp6', 'financing_credit', 'Financing, credit or grants'),
  ref('rrp7', 'infrastructure_logistics', 'Infrastructure or logistics (storage, transport, cold chain)'),
  ref('rrp8', 'policy_support', 'Policy or regulatory support'),
  ref('rrp9', 'tech_readiness', 'Technology readiness'),
  ref('rrp10', 'other', 'Other (please specify)'),
]

export const REF_TRAINING_TOPIC: RefRow[] = [
  ref('rtt_a', 'modern_agriculture', 'Modern agriculture'),
  ref('rtt_b', 'smallholding', 'Smallholding management'),
  ref('rtt_c', 'irrigation', 'Irrigation'),
  ref('rtt_d', 'product_quality', 'Product quality'),
  ref('rtt_e', 'food_processing', 'Food processing'),
  ref('rtt_f', 'marketing', 'Marketing'),
]

export const REF_AGRI_INVOLVEMENT: RefRow[] = [
  ref('rai1', 'farmer_own_land', 'Farmer (own land)'),
  ref('rai2', 'farmer_rented_land', 'Farmer (rented or shared land)'),
  ref('rai3', 'agri_worker', 'Agricultural worker'),
  ref('rai4', 'agribusiness_owner', 'Agribusiness owner'),
  ref('rai5', 'student', 'Student (agriculture-related)'),
  ref('rai6', 'not_working_agri', 'Not currently working in agriculture'),
]

export const REF_ACTIVITY_TYPE: RefRow[] = [
  ref('rat1', 'crop_production', 'Crop production'),
  ref('rat2', 'livestock', 'Livestock'),
  ref('rat3', 'greenhouse', 'Greenhouse farming'),
  ref('rat4', 'food_processing', 'Food processing'),
  ref('rat5', 'other', 'Other'),
]

export const REF_PRODUCT: RefRow[] = [
  ref('rp1', 'fresh_fruits', 'Fresh fruits'),
  ref('rp2', 'vegetables', 'Vegetables'),
  ref('rp3', 'dairy', 'Dairy products'),
  ref('rp4', 'meat_livestock', 'Meat and livestock products'),
  ref('rp5', 'honey', 'Honey and bee products'),
  ref('rp6', 'olive_oil', 'Olive oil and olives'),
  ref('rp7', 'pickled_preserved', 'Pickled and preserved products'),
  ref('rp8', 'baked_traditional', 'Baked and traditional food products'),
  ref('rp9', 'jams_processed', 'Jams and processed foods'),
  ref('rp10', 'herbs_medicinal', 'Herbs and medicinal plants'),
  ref('rp11', 'handicrafts', 'Handicrafts'),
]

export const REF_PRODUCER_TYPE: RefRow[] = [
  ref('rpt1', 'individual_farmer', 'Individual farmer or producer'),
  ref('rpt2', 'household_producer', 'Household producer'),
  ref('rpt3', 'cooperative', 'Agricultural cooperative'),
  ref('rpt4', 'association', 'Agricultural association'),
  ref('rpt5', 'food_processing_business', 'Food-processing business'),
  ref('rpt6', 'agri_enterprise', 'Agricultural enterprise'),
  ref('rpt7', 'handicraft_producer', 'Handicraft producer'),
  ref('rpt8', 'womens_group', "Women's or community group"),
  ref('rpt9', 'other', 'Other (specify)'),
]

/* ── people ─────────────────────────────────────────────────────────────── */
export const PEOPLE: Person[] = [
  {
    ...base('p1', '2026-03-11T15:40:00Z'),
    national_id: '991200447',
    full_name: 'Aisha Al-Zoubi',
    sex: 'female',
    date_of_birth: null,
    age_recorded: 34,
    phone: '079 442 1180',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Al Turra',
    agri_involvement_id: 'rai1',
    auth_user_id: null,
    notes: null,
  },
  {
    ...base('p2', '2026-03-18T12:05:00Z'),
    national_id: '988145520',
    full_name: 'Khaled Obeidat',
    sex: 'male',
    date_of_birth: null,
    age_recorded: 41,
    phone: '077 615 3390',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Al Turra',
    agri_involvement_id: 'rai1',
    auth_user_id: null,
    notes: null,
  },
  {
    ...base('p3', '2026-04-02T09:20:00Z'),
    national_id: '200311498',
    full_name: 'Noor Al-Rousan',
    sex: 'female',
    date_of_birth: null,
    age_recorded: 27,
    phone: '078 220 7741',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Amrawa',
    agri_involvement_id: 'rai4',
    auth_user_id: null,
    notes: null,
  },
  {
    ...base('p4', '2026-04-09T14:55:00Z'),
    national_id: '977230146',
    full_name: 'Yousef Al-Momani',
    sex: 'male',
    date_of_birth: null,
    age_recorded: 52,
    phone: '079 331 6628',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Al Shajara',
    agri_involvement_id: 'rai2',
    auth_user_id: null,
    notes: null,
  },
  {
    ...base('p5', '2026-04-23T11:10:00Z'),
    national_id: '200455712',
    full_name: 'Maryam Haddad',
    sex: 'female',
    date_of_birth: null,
    age_recorded: 23,
    phone: '077 908 4412',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Al Thnaibeh',
    agri_involvement_id: 'rai5',
    auth_user_id: null,
    notes: null,
  },
  {
    ...base('p6', '2026-05-07T16:30:00Z'),
    national_id: '984117603',
    full_name: 'Omar Al-Sharif',
    sex: 'male',
    date_of_birth: null,
    age_recorded: 38,
    phone: '078 550 1207',
    nationality_id: null,
    is_refugee: null,
    has_disability: null,
    disability_type_id: null,
    village: 'Amrawa',
    agri_involvement_id: 'rai3',
    auth_user_id: null,
    notes: null,
  },
]

/** Activity types per person (person_activity_type junction, flattened). */
export const PERSON_ACTIVITY: Record<string, string[]> = {
  p1: ['rat4'],
  p2: ['rat1'],
  p3: ['rat4'],
  p4: ['rat1', 'rat2'],
  p5: ['rat5'],
  p6: ['rat1'],
}

/* ── partners and partnerships ──────────────────────────────────────────── */
export const PARTNERS: Partner[] = [
  {
    ...base('pt1', '2026-02-14T10:15:00Z'),
    name: 'Jordan University of Science and Technology',
    unit: 'Faculty of Agriculture',
    contact_person: 'Dr. Rania Al-Masri',
    phone: '077 412 8830',
    email: 'r.masri@just.edu.jo',
  },
  {
    ...base('pt2', '2026-02-19T13:40:00Z'),
    name: 'National Agricultural Research Centre',
    unit: null,
    contact_person: 'Eng. Samer Obeidat',
    phone: '079 335 1204',
    email: 's.obeidat@narc.gov.jo',
  },
  {
    ...base('pt3', '2026-03-02T09:05:00Z'),
    name: 'Ministry of Agriculture',
    unit: 'Extension Directorate',
    contact_person: 'Eng. Huda Al-Zoubi',
    phone: '078 660 4417',
    email: 'h.zoubi@moa.gov.jo',
  },
  {
    ...base('pt4', '2026-03-21T15:25:00Z'),
    name: 'Zikra Initiative',
    unit: null,
    contact_person: 'Lina Haddad',
    phone: '079 118 7742',
    email: 'lina@zikra.jo',
  },
  {
    ...base('pt5', '2026-04-08T11:00:00Z'),
    name: 'Ramtha Agricultural Research Centre',
    unit: null,
    contact_person: 'Eng. Fadi Nusair',
    phone: '077 902 3311',
    email: 'f.nusair@rarc.gov.jo',
  },
  {
    ...base('pt6', '2026-04-20T14:20:00Z'),
    name: 'Sahel Horan Dairy Processing Facility',
    unit: null,
    contact_person: 'Mahmoud Al-Sharif',
    phone: '078 445 9012',
    email: 'info@shdairy.jo',
  },
  {
    ...base('pt7', '2026-05-11T10:45:00Z'),
    name: 'Cities and Villages Development Bank',
    unit: null,
    contact_person: 'Reem Qudah',
    phone: '079 550 2288',
    email: 'r.qudah@cvdb.jo',
  },
]

export const PARTNERSHIPS: Partnership[] = [
  {
    ...base('ps1', '2026-02-14T10:15:00Z'),
    partner_id: 'pt1',
    partnership_type: 'training',
    partner_type_id: 'rtt3',
    partner_type_other: null,
    established_on: '2026-02-14',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps2', '2026-02-19T13:40:00Z'),
    partner_id: 'pt2',
    partnership_type: 'training',
    partner_type_id: 'rtt2',
    partner_type_other: null,
    established_on: '2026-02-19',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps3', '2026-03-02T09:05:00Z'),
    partner_id: 'pt3',
    partnership_type: 'training',
    partner_type_id: 'rtt1',
    partner_type_other: null,
    established_on: '2026-03-02',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps4', '2026-03-21T15:25:00Z'),
    partner_id: 'pt4',
    partnership_type: 'training',
    partner_type_id: 'rtt5',
    partner_type_other: null,
    established_on: '2026-03-21',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps5', '2026-04-08T11:00:00Z'),
    partner_id: 'pt5',
    partnership_type: 'production_support',
    partner_type_id: 'rtp2',
    partner_type_other: null,
    established_on: '2026-04-08',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps6', '2026-04-20T14:20:00Z'),
    partner_id: 'pt6',
    partnership_type: 'production_support',
    partner_type_id: 'rtp3',
    partner_type_other: null,
    established_on: '2026-04-20',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
  {
    ...base('ps7', '2026-05-11T10:45:00Z'),
    partner_id: 'pt7',
    partnership_type: 'production_support',
    partner_type_id: 'rtp5',
    partner_type_other: null,
    established_on: '2026-05-11',
    agreement_ref: null,
    is_active: true,
    ended_on: null,
  },
]

/** Roles per partnership (partnership_role junction, flattened). */
export const PARTNERSHIP_ROLES: Record<string, string[]> = {
  ps1: ['rrt2', 'rrt7'],
  ps2: ['rrt1', 'rrt7'],
  ps3: ['rrt7', 'rrt6'],
  ps4: ['rrt6', 'rrt4'],
  ps5: ['rrp1'],
  ps6: ['rrp3', 'rrp5'],
  ps7: ['rrp6'],
}

/** Who entered each partner row, for the detail screen footer. */
export const PARTNER_META: Record<string, { by: string; at: string }> = {
  pt1: { by: 'Coordinator', at: '2026-02-14T10:15:00Z' },
  pt2: { by: 'Coordinator', at: '2026-02-19T13:40:00Z' },
  pt3: { by: 'Coordinator', at: '2026-03-02T09:05:00Z' },
  pt4: { by: 'S. Obeidat', at: '2026-03-21T15:25:00Z' },
  pt5: { by: 'Coordinator', at: '2026-04-08T11:00:00Z' },
  pt6: { by: 'Coordinator', at: '2026-04-20T14:20:00Z' },
  pt7: { by: 'F. Nusair', at: '2026-05-11T10:45:00Z' },
}

/* ── training ───────────────────────────────────────────────────────────── */
export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    ...base('ts1', '2026-03-01T09:00:00Z'),
    title: 'Food processing',
    topic_id: 'rtt_e',
    start_date: '2026-03-11',
    end_date: '2026-03-11',
    venue: null,
    delivered_by_partnership_id: 'ps1',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
  {
    ...base('ts2', '2026-03-15T09:00:00Z'),
    title: 'Irrigation',
    topic_id: 'rtt_c',
    start_date: '2026-03-18',
    end_date: '2026-03-18',
    venue: null,
    delivered_by_partnership_id: 'ps2',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
  {
    ...base('ts3', '2026-04-01T09:00:00Z'),
    title: 'Product quality',
    topic_id: 'rtt_d',
    start_date: '2026-04-02',
    end_date: '2026-04-02',
    venue: null,
    delivered_by_partnership_id: 'ps1',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
  {
    ...base('ts4', '2026-04-08T09:00:00Z'),
    title: 'Smallholding management',
    topic_id: 'rtt_b',
    start_date: '2026-04-09',
    end_date: '2026-04-09',
    venue: null,
    delivered_by_partnership_id: 'ps2',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
  {
    ...base('ts5', '2026-04-22T09:00:00Z'),
    title: 'Marketing',
    topic_id: 'rtt_f',
    start_date: '2026-04-23',
    end_date: '2026-04-23',
    venue: null,
    delivered_by_partnership_id: 'ps3',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
  {
    ...base('ts6', '2026-05-06T09:00:00Z'),
    title: 'Modern agriculture',
    topic_id: 'rtt_a',
    start_date: '2026-05-07',
    end_date: '2026-05-07',
    venue: null,
    delivered_by_partnership_id: 'ps3',
    is_delivered: true,
    origin: 'created',
    planned_seats: 20,
    // Added by migration 0043. Mock rows predate it and carry the values a
    // pre-existing row received: unpublished, uncancelled, nothing to describe.
    description: null,
    focal_point: null,
    duration_hours: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,
    is_cancelled: false,
    cancellation_reason: null,

  },
]

export const TRAINING_ENROLMENTS: TrainingEnrolment[] = [
  {
    ...base('te1', '2026-03-11T15:40:00Z'),
    person_id: 'p1',
    session_id: 'ts1',
    registered_on: '2026-03-11',
    attended: true,
    met_criteria: true,
    decided_on: '2026-03-11',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
  {
    ...base('te2', '2026-03-18T12:05:00Z'),
    person_id: 'p2',
    session_id: 'ts2',
    registered_on: '2026-03-18',
    attended: true,
    met_criteria: true,
    decided_on: '2026-03-18',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
  {
    ...base('te3', '2026-04-02T09:20:00Z'),
    person_id: 'p3',
    session_id: 'ts3',
    registered_on: '2026-04-02',
    attended: true,
    met_criteria: true,
    decided_on: '2026-04-02',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
  {
    ...base('te4', '2026-04-09T14:55:00Z'),
    person_id: 'p4',
    session_id: 'ts4',
    registered_on: '2026-04-09',
    attended: true,
    met_criteria: false,
    decided_on: '2026-04-09',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
  {
    ...base('te5', '2026-04-23T11:10:00Z'),
    person_id: 'p5',
    session_id: 'ts5',
    registered_on: '2026-04-23',
    attended: true,
    met_criteria: true,
    decided_on: '2026-04-23',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
  {
    ...base('te6', '2026-05-07T16:30:00Z'),
    person_id: 'p6',
    session_id: 'ts6',
    registered_on: '2026-05-07',
    attended: true,
    met_criteria: false,
    decided_on: '2026-05-07',
    decided_by: null,
    client_uuid: null,
    // Added by migration 0044. These are staff-entered completions, so they
    // take the same backfill the real rows did: approved, never applied.
    application_status: 'approved',
    submitted_by_participant: false,
    applied_on: null,

  },
]

export const ENROLMENT_META: Record<string, { by: string; at: string }> = {
  te1: { by: 'H. Al-Zoubi', at: '2026-03-11T15:40:00Z' },
  te2: { by: 'H. Al-Zoubi', at: '2026-03-18T12:05:00Z' },
  te3: { by: 'S. Obeidat', at: '2026-04-02T09:20:00Z' },
  te4: { by: 'S. Obeidat', at: '2026-04-09T14:55:00Z' },
  te5: { by: 'L. Haddad', at: '2026-04-23T11:10:00Z' },
  te6: { by: 'L. Haddad', at: '2026-05-07T16:30:00Z' },
}

/* ── market linkages ────────────────────────────────────────────────────── */
export const LINKAGES: MarketLinkage[] = [
  {
    ...base('ml1', '2026-05-02T09:30:00Z'),
    initiative_id: 'in1',
    partnership_id: 'ps6',
    scope: 'Shared use of the pasteurising line for labneh production',
    request: 'Two production days a week and cold storage for 200kg',
    linked_on: '2026-05-02',
    status: 'active',
    outcome: null,
  },
  {
    ...base('ml2', '2026-05-14T13:10:00Z'),
    initiative_id: 'in2',
    partnership_id: 'ps5',
    scope: 'Drip irrigation retrofit and seasonal soil testing',
    request: 'Site visit and a soil report before the autumn planting',
    linked_on: '2026-05-14',
    status: 'active',
    outcome: null,
  },
  {
    ...base('ml3', '2026-06-01T11:55:00Z'),
    initiative_id: 'in3',
    partnership_id: 'ps7',
    scope: 'Working capital loan for packaging equipment',
    request: 'Loan assessment for 4,000 JOD of packaging equipment',
    linked_on: '2026-06-01',
    status: 'under_review',
    outcome: null,
  },
  {
    ...base('ml4', '2026-06-18T16:05:00Z'),
    initiative_id: 'in4',
    partnership_id: 'ps6',
    scope: 'Contract supply of jams to the processing facility',
    request: 'Trial order of 60 jars for the winter market',
    linked_on: '2026-06-18',
    status: 'active',
    outcome: null,
  },
]

/** initiative -> person, so a linkage can resolve its farmer. */
export const INITIATIVE_PERSON: Record<string, string> = {
  in1: 'p1',
  in2: 'p2',
  in3: 'p3',
  in4: 'p5',
}

export const LINKAGE_META: Record<string, { by: string; at: string }> = {
  ml1: { by: 'Coordinator', at: '2026-05-02T09:30:00Z' },
  ml2: { by: 'F. Nusair', at: '2026-05-14T13:10:00Z' },
  ml3: { by: 'Coordinator', at: '2026-06-01T11:55:00Z' },
  ml4: { by: 'L. Haddad', at: '2026-06-18T16:05:00Z' },
}

/* ── exhibitions ────────────────────────────────────────────────────────── */
export const EXHIBITIONS: Exhibition[] = [
  {
    ...base('ex1', '2026-02-02T10:00:00Z'),
    name: 'Sahel Horan Spring Producers Market',
    start_date: '2026-03-12',
    end_date: '2026-03-14',
    location: 'Municipality Square, Al-Turra',
    booth_capacity: 30,
    external_sponsor: null,
    // Added by migration 0043.
    description: null,
    focal_point: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,

    is_cancelled: false,
  },
  {
    ...base('ex2', '2026-03-01T09:40:00Z'),
    name: 'Ramtha Food Processing Fair',
    start_date: '2026-04-22',
    end_date: '2026-04-23',
    location: 'Municipal Hall, Ramtha',
    booth_capacity: 24,
    external_sponsor: 'Enabel',
    // Added by migration 0043.
    description: null,
    focal_point: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,

    is_cancelled: false,
  },
  {
    ...base('ex3', '2026-07-12T14:15:00Z'),
    name: 'Olive and Oil Season Market',
    start_date: '2026-10-09',
    end_date: '2026-10-12',
    location: 'Sahel Horan Cultural Centre',
    booth_capacity: 36,
    external_sponsor: null,
    // Added by migration 0043.
    description: null,
    focal_point: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,

    is_cancelled: false,
  },
  {
    ...base('ex4', '2026-08-04T11:30:00Z'),
    name: 'Winter Handicrafts and Preserves Market',
    start_date: '2026-12-04',
    end_date: '2026-12-06',
    location: 'Municipality Square, Al-Turra',
    booth_capacity: 30,
    external_sponsor: 'Chamber of Commerce',
    // Added by migration 0043.
    description: null,
    focal_point: null,
    application_opens_on: null,
    application_closes_on: null,
    is_published: false,

    is_cancelled: false,
  },
]

/** Booths already taken per exhibition -- drives the booth counter and Full state. */
export const EXHIBITION_TAKEN: Record<string, number> = {
  ex1: 26,
  ex2: 24,
  ex3: 11,
  ex4: 18,
}

export const EXHIBITION_META: Record<string, { by: string; at: string }> = {
  ex1: { by: 'Coordinator', at: '2026-02-02T10:00:00Z' },
  ex2: { by: 'Coordinator', at: '2026-03-01T09:40:00Z' },
  ex3: { by: 'S. Obeidat', at: '2026-07-12T14:15:00Z' },
  ex4: { by: 'Coordinator', at: '2026-08-04T11:30:00Z' },
}

/* ── registrations ──────────────────────────────────────────────────────── */
export const REGISTRATIONS: ExhibitionRegistration[] = [
  {
    ...base('rg1', '2026-08-06T10:10:00Z'),
    exhibition_id: 'ex4',
    person_id: 'p1',
    producer_type_id: 'rpt2',
    producer_type_other: null,
    is_first_time: false,
    status: 'approved',
    submitted_by_participant: false,
    reviewed_by: null,
    reviewed_at: '2026-08-06T10:10:00Z',
    client_uuid: null,

  },
  {
    ...base('rg2', '2026-08-19T20:42:00Z'),
    exhibition_id: 'ex4',
    person_id: 'p5',
    producer_type_id: 'rpt7',
    producer_type_other: null,
    is_first_time: true,
    status: 'submitted',
    submitted_by_participant: true,
    reviewed_by: null,
    reviewed_at: null,
    client_uuid: null,

  },
  {
    ...base('rg3', '2026-07-22T09:25:00Z'),
    exhibition_id: 'ex3',
    person_id: 'p2',
    producer_type_id: 'rpt1',
    producer_type_other: null,
    is_first_time: false,
    status: 'approved',
    submitted_by_participant: false,
    reviewed_by: null,
    reviewed_at: '2026-07-22T09:25:00Z',
    client_uuid: null,

  },
  {
    ...base('rg4', '2026-08-20T18:03:00Z'),
    exhibition_id: 'ex3',
    person_id: 'p7_external',
    producer_type_id: 'rpt8',
    producer_type_other: null,
    is_first_time: true,
    status: 'submitted',
    submitted_by_participant: true,
    reviewed_by: null,
    reviewed_at: null,
    client_uuid: null,

  },
  {
    ...base('rg5', '2026-04-14T12:40:00Z'),
    exhibition_id: 'ex2',
    person_id: 'p3',
    producer_type_id: 'rpt5',
    producer_type_other: null,
    is_first_time: false,
    status: 'approved',
    submitted_by_participant: false,
    reviewed_by: null,
    reviewed_at: '2026-04-14T12:40:00Z',
    client_uuid: null,

  },
  {
    ...base('rg6', '2026-03-04T08:55:00Z'),
    exhibition_id: 'ex1',
    person_id: 'p8_external',
    producer_type_id: 'rpt3',
    producer_type_other: null,
    is_first_time: true,
    status: 'approved',
    submitted_by_participant: false,
    reviewed_by: null,
    reviewed_at: '2026-03-04T08:55:00Z',
    client_uuid: null,

  },
]

/** Producers who registered but never went through Training Completion. */
export const EXTERNAL_PRODUCERS: Record<string, { national_id: string; full_name: string; phone: string }> = {
  p7_external: { national_id: '200188034', full_name: 'Fatima Al-Khalidi', phone: '078 774 2210' },
  p8_external: { national_id: '979442015', full_name: 'Ahmad Al-Bataineh', phone: '079 663 5518' },
}

/** Products per registration (exhibition_registration_product junction). */
export const REGISTRATION_PRODUCTS: Record<string, string[]> = {
  rg1: ['rp9', 'rp7'],
  rg2: ['rp11', 'rp10'],
  rg3: ['rp6'],
  rg4: ['rp6', 'rp7'],
  rg5: ['rp3', 'rp8'],
  rg6: ['rp2', 'rp1'],
}

export const REGISTRATION_META: Record<string, { by: string; at: string }> = {
  rg1: { by: 'Coordinator', at: '2026-08-06T10:10:00Z' },
  rg2: { by: 'Producer portal', at: '2026-08-19T20:42:00Z' },
  rg3: { by: 'S. Obeidat', at: '2026-07-22T09:25:00Z' },
  rg4: { by: 'Producer portal', at: '2026-08-20T18:03:00Z' },
  rg5: { by: 'Coordinator', at: '2026-04-14T12:40:00Z' },
  rg6: { by: 'Coordinator', at: '2026-03-04T08:55:00Z' },
}

/* ── follow-up surveys ──────────────────────────────────────────────────── */
export const SURVEYS: FollowupSurvey[] = [
  {
    ...base('fu1', '2026-08-12T11:20:00Z'),
    person_id: 'p1',
    round: 'six_month',
    contact_date: '2026-08-12',
    contact_mode: 'telephone',
    enumerator_name: 'R. Nusair',
    respondent: 'participant',
    status: 'approved',
    q08_applied_knowledge: 'regularly',
    q14_used_office: true,
    q16_advice_useful: 'very',
    q17_activity_status: 'expanded',
    q18_started_after_support: true,
    q22_volume_change: null,
    q26_workers_total: null,
    q26_workers_women: null,
    q26_workers_under30: null,
    q29_selling_change: null,
    q30_events_attended: null,
    q30_is_overridden: false,
    q31_last_event_sales_band: null,
    q34_connection_made: null,
    q37_still_engaged: null,
    q38_capacity: null,
    q40_income_change: null,
    q43_enumerator_notes: null,
    client_uuid: null,

  },
  {
    ...base('fu2', '2026-08-13T15:05:00Z'),
    person_id: 'p2',
    round: 'six_month',
    contact_date: '2026-08-13',
    contact_mode: 'site_visit',
    enumerator_name: 'R. Nusair',
    respondent: 'participant',
    status: 'approved',
    q08_applied_knowledge: 'occasionally',
    q14_used_office: false,
    q16_advice_useful: null,
    q17_activity_status: 'same',
    q18_started_after_support: false,
    q22_volume_change: null,
    q26_workers_total: null,
    q26_workers_women: null,
    q26_workers_under30: null,
    q29_selling_change: null,
    q30_events_attended: null,
    q30_is_overridden: false,
    q31_last_event_sales_band: null,
    q34_connection_made: null,
    q37_still_engaged: null,
    q38_capacity: null,
    q40_income_change: null,
    q43_enumerator_notes: null,
    client_uuid: null,

  },
  {
    ...base('fu3', '2026-08-14T10:35:00Z'),
    person_id: 'p3',
    round: 'six_month',
    contact_date: '2026-08-14',
    contact_mode: 'municipal_office',
    enumerator_name: 'M. Freij',
    respondent: 'participant',
    status: 'draft',
    q08_applied_knowledge: null,
    q14_used_office: null,
    q16_advice_useful: null,
    q17_activity_status: null,
    q18_started_after_support: null,
    q22_volume_change: null,
    q26_workers_total: null,
    q26_workers_women: null,
    q26_workers_under30: null,
    q29_selling_change: null,
    q30_events_attended: null,
    q30_is_overridden: false,
    q31_last_event_sales_band: null,
    q34_connection_made: null,
    q37_still_engaged: null,
    q38_capacity: null,
    q40_income_change: null,
    q43_enumerator_notes: null,
    client_uuid: null,

  },
  {
    ...base('fu4', '2026-08-14T16:50:00Z'),
    person_id: 'p4',
    round: 'six_month',
    contact_date: null,
    contact_mode: 'telephone',
    enumerator_name: 'M. Freij',
    respondent: 'not_reached',
    status: 'rejected',
    q08_applied_knowledge: null,
    q14_used_office: null,
    q16_advice_useful: null,
    q17_activity_status: null,
    q18_started_after_support: null,
    q22_volume_change: null,
    q26_workers_total: null,
    q26_workers_women: null,
    q26_workers_under30: null,
    q29_selling_change: null,
    q30_events_attended: null,
    q30_is_overridden: false,
    q31_last_event_sales_band: null,
    q34_connection_made: null,
    q37_still_engaged: null,
    q38_capacity: null,
    q40_income_change: null,
    q43_enumerator_notes: null,
    client_uuid: null,

  },
]

export const SURVEY_META: Record<string, { by: string; at: string }> = {
  fu1: { by: 'R. Nusair', at: '2026-08-12T11:20:00Z' },
  fu2: { by: 'R. Nusair', at: '2026-08-13T15:05:00Z' },
  fu3: { by: 'M. Freij', at: '2026-08-14T10:35:00Z' },
  fu4: { by: 'M. Freij', at: '2026-08-14T16:50:00Z' },
}

/* ── manual entries ─────────────────────────────────────────────────────── */
export type ManualIndicator = {
  code: string
  target: string
  current: string
  isBool: boolean
}

export const MANUAL_INDICATORS: ManualIndicator[] = [
  { code: 'B1.1', target: '1', current: '0', isBool: true },
  { code: 'B1.2', target: '100', current: '0', isBool: false },
  { code: 'C1.3', target: '—', current: '0', isBool: false },
  { code: 'D0.2', target: '8', current: '0', isBool: false },
  { code: 'F0.1', target: '12', current: '0', isBool: false },
  { code: 'G0.1', target: '1', current: '1', isBool: true },
  { code: 'G0.2', target: '14', current: '0', isBool: false },
  { code: 'G0.3', target: '4', current: '0', isBool: false },
]

/** The signed-in producer for the participant portal. */
export const PORTAL_PERSON_ID = 'p1'

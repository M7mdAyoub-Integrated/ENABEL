-- ═══════════════════════════════════════════════════════════════════════════
--  0180 — Ramtha's eighteen indicator views, from the "Calculation Method"
--         sheet of RMTH_Forms_and_Calculations_v2.xlsx
--
--  One v_ind_rmth_* leaf view per indicator, the shape every leaf view has:
--  (period_code, actual, denominator, municipality_id), one row per Ramtha
--  quarter, anchored on `municipality m where m.code = 'RMTH'`, revoked from
--  every client role (0114) and read through v_indicator_actual's gate. Each
--  view implements its indicator's Formula cell -- stored verbatim in
--  indicator.formula by 0179 -- and its header quotes the clause it follows.
--
--  ── WHAT COUNTS ──
--
--  A record counts while it is live (deleted_at is null). A person-level
--  record also needs its person to be in the register, live -- FORM-01 is
--  the population ("If the person is not found, register them in FORM-01
--  first") -- and a participation or feedback also needs its activity live.
--  v_rmth_registered and v_rmth_activity_live hold those two rules once.
--  Person-level indicators count DISTINCT person_id (hard rule 4).
--
--  ── WHICH WINDOW ──
--
--  The sheet says "in the reporting quarter" for some and "in the reporting
--  year" for others, and "cumulative" for IMP-0 and E0.1. As Khalidiyah's
--  views read their Frequency column (OQ-65), a quarter's row is: the
--  quarter itself; the calendar year to date (1 January of the quarter's
--  year to its end); or everything to its end. A quarter not yet begun reads
--  NULL, never the total so far. Dates are the Municipality's (Asia/Amman):
--  IS-03 is a timestamp and is read as its Amman date.
--
--  ── WHAT IS NOT COMPUTABLE ──
--
--  Four formulas have a parameter the sheet marks REQUIRES CONFIRMATION, and
--  read it from rmth_threshold (0179): IMP-0's X months, C1.1's maximum
--  duration and minimum total hours, SO3-0's N months of six, F0.2's
--  programmes-or-sessions. While a value is null the indicator's actual is
--  NULL -- "not computable until decided", named on the dashboard by
--  v_rmth_indicator_status -- never zero. Every other indicator computes.
--
--  ── PERCENTAGES ──
--
--  actual is the percentage to one decimal, denominator the count it is of;
--  with nothing in the denominator the actual is NULL and the denominator 0,
--  so "no response yet" never reads as 0%.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0180_actual_before on commit drop as
  select * from public.v_indicator_actual
   where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2');

-- ── 1. the two rules every view shares ───────────────────────────────────

-- A person in Ramtha's register, live, whose person row is live.
create view public.v_rmth_registered as
select b.person_id, b.municipality_id
  from public.rmth_beneficiary b
  join public.person pe on pe.id = b.person_id and pe.deleted_at is null
 where b.deleted_at is null;

-- A live activity with its category and networking type as codes.
create view public.v_rmth_activity_live as
select a.id, a.municipality_id, a.start_date, a.end_date, a.project_id, a.contact_hours, a.sessions_delivered,
       c.code as category, nt.code as networking_type
  from public.rmth_activity a
  join public.ref_rmth_activity_category c on c.id = a.category_id
  left join public.ref_rmth_networking_type nt on nt.id = a.networking_type_id
 where a.deleted_at is null;

-- A live participation of a registered person on a live activity.
create view public.v_rmth_participation_live as
select x.id, x.municipality_id, x.person_id, x.completed, x.service_date,
       a.id as activity_id, a.category, a.start_date, a.end_date
  from public.rmth_participation x
  join public.v_rmth_activity_live a on a.id = x.activity_id
  join public.v_rmth_registered r on r.person_id = x.person_id and r.municipality_id = x.municipality_id
 where x.deleted_at is null;

-- ── 2. the eighteen ──────────────────────────────────────────────────────

-- RMTH-IMP-0 · cumulative, each person once. "Use the latest FORM-06 record
-- per person (MAX FU-02). Sustained = FU-06 ∈ {Paid employment, Self
-- employment or own business} AND months between FU-07 and FU-02 ≥ X.
-- Eligible person: PR-01 appears in FORM-04 (PA-02) for any activity OR
-- latest FU-09 = Yes." The latest is the latest up to the quarter's end; a
-- participation makes a person eligible from its activity's start.
create view public.v_ind_rmth_imp_0 as
with latest as (
  select rp.id as period_id, f.person_id, f.municipality_id, f.followup_date, f.continuous_since,
         f.in_municipal_project, ws.code as work_status,
         row_number() over (partition by rp.id, f.person_id order by f.followup_date desc, f.created_at desc) as n
    from public.reporting_period rp
    join public.rmth_followup f on f.municipality_id = rp.municipality_id and f.deleted_at is null and f.followup_date <= rp.end_date
    join public.v_rmth_registered r on r.person_id = f.person_id and r.municipality_id = f.municipality_id
    join public.ref_rmth_work_status ws on ws.id = f.work_status_id
)
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            when public.rmth_threshold_numeric(m.id, 'imp0_sustained_months') is null then null
            else (select count(*) from latest l
                   where l.period_id = rp.id and l.n = 1
                     and l.work_status in ('paid_employment', 'self_employment')
                     and l.continuous_since is not null
                     and extract(year from age(l.followup_date, l.continuous_since)) * 12
                         + extract(month from age(l.followup_date, l.continuous_since))
                         >= public.rmth_threshold_numeric(m.id, 'imp0_sustained_months')
                     and (l.in_municipal_project is true
                          or exists (select 1 from public.v_rmth_participation_live x
                                      where x.person_id = l.person_id and x.municipality_id = l.municipality_id
                                        and x.start_date <= rp.end_date)))
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO1-0 · year to date. "Eligible person: PA-02 linked to an activity
-- with AC-02 = Networking event. Outcome = FU-03 includes any of {Job
-- interview, Job offer, Internship or OJT placement, Paid employment} on a
-- follow-up with FU-02 in the reporting year. Result = COUNT(DISTINCT FU-01
-- WHERE eligible AND outcome)." Self-employment is not in the list.
create view public.v_ind_rmth_so1_0 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct f.person_id)
                    from public.rmth_followup f
                    join public.v_rmth_registered r on r.person_id = f.person_id and r.municipality_id = f.municipality_id
                   where f.municipality_id = m.id and f.deleted_at is null
                     and f.followup_date between date_trunc('year', rp.end_date)::date and rp.end_date
                     and exists (select 1 from public.rmth_followup_option o
                                   join public.ref_rmth_employability_outcome e on e.id = o.option_id
                                  where o.followup_id = f.id and o.question_code = 'fu03'
                                    and e.code in ('job_interview', 'job_offer', 'internship', 'paid_employment'))
                     and exists (select 1 from public.v_rmth_participation_live x
                                  where x.person_id = f.person_id and x.municipality_id = f.municipality_id
                                    and x.category = 'networking' and x.start_date <= rp.end_date))
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO1-A1 · the quarter, by AC-04. "Filter: FB-01 activity has AC-02 =
-- Networking event AND AC-04 in the reporting quarter; one response per
-- FB-02 per FB-01 (rmth_feedback_once_per_activity). Numerator =
-- COUNT(FORM-05 WHERE FB-03 = Yes). Denominator = COUNT(FORM-05 WHERE FB-03
-- answered)."
create view public.v_ind_rmth_a1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() or s.den = 0 then null
            else round(100.0 * s.num / s.den, 1) end::numeric as actual,
       case when rp.start_date > public.rmth_today() then null else s.den end::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join lateral (
    select count(*) filter (where fb.improved_knowledge is true) as num,
           count(*) filter (where fb.improved_knowledge is not null) as den
      from public.rmth_feedback fb
      join public.v_rmth_activity_live a on a.id = fb.activity_id
      join public.v_rmth_registered r on r.person_id = fb.person_id and r.municipality_id = fb.municipality_id
     where fb.municipality_id = m.id and fb.deleted_at is null
       and a.category = 'networking' and a.start_date between rp.start_date and rp.end_date) s
 where m.code = 'RMTH';

-- RMTH-SO1-A0.1 · the quarter. "COUNT(FORM-03 WHERE AC-02 = Networking event
-- AND AC-04 in the reporting quarter)." Guidance sessions are networking
-- events, so A0.2 is a subset of this count: never add the two.
create view public.v_ind_rmth_a0_1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(*) from public.v_rmth_activity_live a
                   where a.municipality_id = m.id and a.category = 'networking'
                     and a.start_date between rp.start_date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO1-A0.2 · year to date. "COUNT(FORM-03 WHERE AC-02 = Networking event
-- AND AC-03 = Vocational guidance session AND AC-04 in the reporting year)."
create view public.v_ind_rmth_a0_2 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(*) from public.v_rmth_activity_live a
                   where a.municipality_id = m.id and a.category = 'networking' and a.networking_type = 'guidance_session'
                     and a.start_date between date_trunc('year', rp.end_date)::date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO1-B1 · year to date. "Filter: IS-03 in the reporting year; latest
-- response per project (IS-01). Numerator = COUNT(DISTINCT IS-01 WHERE IS-02
-- = Yes). Denominator = COUNT(DISTINCT IS-01 WHERE IS-02 answered)." A
-- project that has been deleted takes its responses with it.
create view public.v_ind_rmth_b1 as
with latest as (
  select rp.id as period_id, s.project_id, s.support_essential,
         row_number() over (partition by rp.id, s.project_id order by s.surveyed_at desc) as n
    from public.reporting_period rp
    join public.rmth_implementer_survey s on s.municipality_id = rp.municipality_id and s.deleted_at is null
    join public.rmth_project p on p.id = s.project_id and p.deleted_at is null
   where (s.surveyed_at at time zone 'Asia/Amman')::date between date_trunc('year', rp.end_date)::date and rp.end_date
)
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() or x.den = 0 then null
            else round(100.0 * x.num / x.den, 1) end::numeric as actual,
       case when rp.start_date > public.rmth_today() then null else x.den end::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join lateral (
    select count(*) filter (where l.support_essential) as num, count(*) as den
      from latest l where l.period_id = rp.id and l.n = 1) x
 where m.code = 'RMTH';

-- RMTH-SO1-B1.1 · the quarter. "COUNT(FORM-03 WHERE AC-02 = Specialised
-- training programme AND AC-07 is not blank AND AC-04 in the reporting
-- quarter)."
create view public.v_ind_rmth_b1_1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(*) from public.v_rmth_activity_live a
                   where a.municipality_id = m.id and a.category = 'specialised' and a.project_id is not null
                     and a.start_date between rp.start_date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO1-B1.2 · year to date. "COUNT(FORM-02 WHERE PJ-02 in the reporting
-- year)."
create view public.v_ind_rmth_b1_2 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(*) from public.rmth_project p
                   where p.municipality_id = m.id and p.deleted_at is null
                     and p.approved_on between date_trunc('year', rp.end_date)::date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO2-0 · by due date in the quarter. "Completer = PA-03 = Yes on an
-- activity with AC-02 in {Specialised training programme, Short term
-- training cycle}. Due date = AC-05 + 3 months. Denominator = COUNT(DISTINCT
-- PA-02 completers WHERE due date falls in the reporting quarter). Numerator
-- = COUNT(DISTINCT completers in the denominator WITH a FORM-06 record where
-- FU-03 includes {Internship or OJT placement, Paid employment} AND FU-04 ≤
-- AC-05 + 3 months)." Completers not reached at follow-up stay in the
-- denominator. Whether self-employment counts is OQ-80.
create view public.v_ind_rmth_so2_0 as
with completion as (
  select x.person_id, x.municipality_id, (x.end_date + interval '3 months')::date as due
    from public.v_rmth_participation_live x
   where x.completed is true and x.category in ('specialised', 'short_term') and x.end_date is not null
)
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() or s.den = 0 then null
            else round(100.0 * s.num / s.den, 1) end::numeric as actual,
       case when rp.start_date > public.rmth_today() then null else s.den end::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join lateral (
    select count(distinct c.person_id) as den,
           count(distinct c.person_id) filter (where exists (
             select 1 from public.rmth_followup f
               join public.rmth_followup_option o on o.followup_id = f.id and o.question_code = 'fu03'
               join public.ref_rmth_employability_outcome e on e.id = o.option_id
              where f.person_id = c.person_id and f.municipality_id = c.municipality_id and f.deleted_at is null
                and e.code in ('internship', 'paid_employment')
                and f.first_placement_on is not null and f.first_placement_on <= c.due)) as num
      from completion c
     where c.municipality_id = m.id and c.due between rp.start_date and rp.end_date) s
 where m.code = 'RMTH';

-- RMTH-SO2-C1 · the quarter, by AC-05. "Filter: FB-01 activity has AC-02 in
-- {Specialised training programme, Short term training cycle} AND AC-05 in
-- the reporting quarter. Numerator = COUNT(FORM-05 WHERE FB-04 = Yes).
-- Denominator = COUNT(FORM-05 WHERE FB-04 answered)."
create view public.v_ind_rmth_c1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() or s.den = 0 then null
            else round(100.0 * s.num / s.den, 1) end::numeric as actual,
       case when rp.start_date > public.rmth_today() then null else s.den end::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join lateral (
    select count(*) filter (where fb.supported_employment is true) as num,
           count(*) filter (where fb.supported_employment is not null) as den
      from public.rmth_feedback fb
      join public.v_rmth_activity_live a on a.id = fb.activity_id
      join public.v_rmth_registered r on r.person_id = fb.person_id and r.municipality_id = fb.municipality_id
     where fb.municipality_id = m.id and fb.deleted_at is null
       and a.category in ('specialised', 'short_term') and a.end_date between rp.start_date and rp.end_date) s
 where m.code = 'RMTH';

-- RMTH-SO2-C1.1 · year to date, by AC-05. "COUNT(FORM-03 WHERE AC-02 = Short
-- term training cycle AND AC-05 in the reporting year AND AC-08 includes
-- Private sector establishment AND AC-08 includes (Academic institution OR
-- Vocational institution) AND (AC-05 − AC-04) ≤ max duration AND AC-09 ≥ min
-- hours)." Max duration is in weeks (c11_max_weeks), min hours are total
-- contact hours (c11_min_total_hours); both null, not computable.
create view public.v_ind_rmth_c1_1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            when public.rmth_threshold_numeric(m.id, 'c11_max_weeks') is null
              or public.rmth_threshold_numeric(m.id, 'c11_min_total_hours') is null then null
            else (select count(*) from public.v_rmth_activity_live a
                   where a.municipality_id = m.id and a.category = 'short_term'
                     and a.end_date between date_trunc('year', rp.end_date)::date and rp.end_date
                     and (a.end_date - a.start_date) <= public.rmth_threshold_numeric(m.id, 'c11_max_weeks') * 7
                     and a.contact_hours >= public.rmth_threshold_numeric(m.id, 'c11_min_total_hours')
                     and exists (select 1 from public.rmth_activity_option o join public.ref_rmth_joint_partner j on j.id = o.option_id
                                  where o.activity_id = a.id and o.question_code = 'ac08' and j.code = 'private_sector')
                     and exists (select 1 from public.rmth_activity_option o join public.ref_rmth_joint_partner j on j.id = o.option_id
                                  where o.activity_id = a.id and o.question_code = 'ac08' and j.code in ('academic', 'vocational')))
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO2-C1.2 · the quarter, by AC-05. "COUNT(DISTINCT PA-02 WHERE PA-03 =
-- Yes AND activity AC-02 in {Specialised training programme, Short term
-- training cycle} AND AC-05 in the reporting quarter)." The cumulative
-- total, each person once, is v_rmth_indicator_unique.
create view public.v_ind_rmth_c1_2 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct x.person_id) from public.v_rmth_participation_live x
                   where x.municipality_id = m.id and x.completed is true and x.category in ('specialised', 'short_term')
                     and x.end_date between rp.start_date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-0 · year to date. "Eligible person: PA-02 linked to an activity
-- with AC-02 ∈ {Entrepreneurship training programme, Business incubator}.
-- Use the latest FORM-06 record per person with FU-02 in the reporting
-- year. Result = COUNT(DISTINCT FU-01 WHERE eligible AND FU-06 = Self
-- employment or own business AND FU-08 ≥ N)."
create view public.v_ind_rmth_so3_0 as
with latest as (
  select rp.id as period_id, f.person_id, f.municipality_id, f.income_months, ws.code as work_status,
         row_number() over (partition by rp.id, f.person_id order by f.followup_date desc, f.created_at desc) as n
    from public.reporting_period rp
    join public.rmth_followup f on f.municipality_id = rp.municipality_id and f.deleted_at is null
     and f.followup_date between date_trunc('year', rp.end_date)::date and rp.end_date
    join public.v_rmth_registered r on r.person_id = f.person_id and r.municipality_id = f.municipality_id
    join public.ref_rmth_work_status ws on ws.id = f.work_status_id
)
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            when public.rmth_threshold_numeric(m.id, 'so30_income_months_of_six') is null then null
            else (select count(*) from latest l
                   where l.period_id = rp.id and l.n = 1 and l.work_status = 'self_employment'
                     and l.income_months >= public.rmth_threshold_numeric(m.id, 'so30_income_months_of_six')
                     and exists (select 1 from public.v_rmth_participation_live x
                                  where x.person_id = l.person_id and x.municipality_id = l.municipality_id
                                    and x.category in ('entrepreneurship', 'business_incubator') and x.start_date <= rp.end_date))
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-E0.1 · cumulative. "COUNT(FORM-03 WHERE AC-02 = Business
-- incubator AND AC-04 ≤ end of the reporting year)." 'Established' = core
-- incubation services have started (AC-04). Read to the QUARTER's end: an
-- incubator established in Q4 is not established in Q1 of the same year
-- (OQ-80).
create view public.v_ind_rmth_e0_1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(*) from public.v_rmth_activity_live a
                   where a.municipality_id = m.id and a.category = 'business_incubator' and a.start_date <= rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-E0.2 · the quarter, by PA-06. "COUNT(DISTINCT PA-02 WHERE activity
-- AC-02 = Business incubator AND PA-05 not empty AND PA-06 in the reporting
-- quarter)."
create view public.v_ind_rmth_e0_2 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct x.person_id) from public.v_rmth_participation_live x
                   where x.municipality_id = m.id and x.category = 'business_incubator'
                     and x.service_date between rp.start_date and rp.end_date
                     and exists (select 1 from public.rmth_participation_option o
                                  where o.participation_id = x.id and o.question_code = 'pa05'))
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-E0.3 · the quarter, by AC-05. "COUNT(DISTINCT PA-02 WHERE activity
-- AC-02 = Incubator design training AND PA-03 = Yes AND AC-05 in the
-- reporting quarter)."
create view public.v_ind_rmth_e0_3 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct x.person_id) from public.v_rmth_participation_live x
                   where x.municipality_id = m.id and x.completed is true and x.category = 'incubator_design'
                     and x.end_date between rp.start_date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-F0.1 · the quarter, by AC-05. "COUNT(DISTINCT PA-02 WHERE activity
-- AC-02 = Entrepreneurship training programme AND PA-03 = Yes AND AC-05 in
-- the reporting quarter)."
create view public.v_ind_rmth_f0_1 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct x.person_id) from public.v_rmth_participation_live x
                   where x.municipality_id = m.id and x.completed is true and x.category = 'entrepreneurship'
                     and x.end_date between rp.start_date and rp.end_date)
       end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH';

-- RMTH-SO3-F0.2 · year to date, by AC-04. "Result (statement) = COUNT(FORM-03
-- WHERE AC-02 = Entrepreneurship training programme AND AC-04 in the
-- reporting year). Alternative (definition) = SUM(AC-11) for the same
-- records = sessions delivered." Which one is f02_counting_reading.
create view public.v_ind_rmth_f0_2 as
select rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            when public.rmth_threshold_text(m.id, 'f02_counting_reading') = 'programmes' then s.programmes
            when public.rmth_threshold_text(m.id, 'f02_counting_reading') = 'sessions' then s.sessions
            else null end::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join lateral (
    select count(*) as programmes, coalesce(sum(a.sessions_delivered), 0) as sessions
      from public.v_rmth_activity_live a
     where a.municipality_id = m.id and a.category = 'entrepreneurship'
       and a.start_date between date_trunc('year', rp.end_date)::date and rp.end_date) s
 where m.code = 'RMTH';

-- ── 3. the aggregate view: 0174's definition plus the eighteen ───────────
create or replace view public.v_indicator_actual as
select code, period_code, actual, denominator, municipality_id
  from (
    select 'IMP-0'::text as code, period_code, actual, denominator, municipality_id from public.v_ind_imp_0
    union all select 'A1',   period_code, actual, denominator, municipality_id from public.v_ind_a1
    union all select 'A1.2', period_code, actual, denominator, municipality_id from public.v_ind_a1_2
    union all select 'A1.3', period_code, actual, denominator, municipality_id from public.v_ind_a1_3
    union all select 'B1',   period_code, actual, denominator, municipality_id from public.v_ind_b1
    union all select 'B1.1', period_code, actual, denominator, municipality_id from public.v_ind_b1_1
    union all select 'B1.2', period_code, actual, denominator, municipality_id from public.v_ind_b1_2
    union all select 'C1',   period_code, actual, denominator, municipality_id from public.v_ind_c1
    union all select 'C1.1', period_code, actual, denominator, municipality_id from public.v_ind_c1_1
    union all select 'C1.2', period_code, actual, denominator, municipality_id from public.v_ind_c1_2
    union all select 'C1.3', period_code, actual, denominator, municipality_id from public.v_ind_c1_3
    union all select 'D0.1', period_code, actual, denominator, municipality_id from public.v_ind_d0_1
    union all select 'D0.2', period_code, actual, denominator, municipality_id from public.v_ind_d0_2
    union all select 'E0.1', period_code, actual, denominator, municipality_id from public.v_ind_e0_1
    union all select 'E0.2', period_code, actual, denominator, municipality_id from public.v_ind_e0_2
    union all select 'F0.1', period_code, actual, denominator, municipality_id from public.v_ind_f0_1
    union all select 'G0.1', period_code, actual, denominator, municipality_id from public.v_ind_g0_1
    union all select 'G0.2', period_code, actual, denominator, municipality_id from public.v_ind_g0_2
    union all select 'G0.3', period_code, actual, denominator, municipality_id from public.v_ind_g0_3
    union all select 'G0.4', period_code, actual, denominator, municipality_id from public.v_ind_g0_4
    -- Ramtha (0180, RMTH_Forms_and_Calculations_v2.xlsx)
    union all select 'IMP-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_imp_0
    union all select 'SO1-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so1_0
    union all select 'A1',    period_code, actual, denominator, municipality_id from public.v_ind_rmth_a1
    union all select 'A0.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a0_1
    union all select 'A0.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a0_2
    union all select 'B1',    period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1
    union all select 'B1.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1_1
    union all select 'B1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1_2
    union all select 'SO2-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so2_0
    union all select 'C1',    period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1
    union all select 'C1.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1_1
    union all select 'C1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1_2
    union all select 'SO3-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so3_0
    union all select 'E0.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_1
    union all select 'E0.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_2
    union all select 'E0.3',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_3
    union all select 'F0.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_f0_1
    union all select 'F0.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_f0_2
    -- Khalidiyah (0162, 0163)
    union all select 'IMP-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_imp_0
    union all select 'SO1-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so1_0
    union all select 'A1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a1
    union all select 'A2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a2
    union all select 'A3',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a3
    union all select 'B1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_b1
    union all select 'SO2-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so2_0
    union all select 'C1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_c1
    union all select 'C2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_c2
    union all select 'D1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_d1
    union all select 'D2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_d2
    union all select 'SO3-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so3_0
    union all select 'E1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_e1
    union all select 'F1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f1
    union all select 'F2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f2
    union all select 'F3',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f3
    union all select 'SO4-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so4_0
    union all select 'G1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_g1
    union all select 'G2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_g2
    union all select 'H1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_h1
    union all select 'H2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_h2
  ) x
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(municipality_id));

-- ── 4. why a figure is missing, and C1.2's cumulative total ─────────────
create or replace view public.v_rmth_indicator_status as
select i.municipality_id, i.code, i.full_code,
       case when i.view_name is null then 'no_statement'
            when exists (select 1 from unnest(k.keys) kk
                          where not exists (select 1 from public.rmth_threshold t
                                             where t.municipality_id = i.municipality_id and t.key = kk and t.deleted_at is null
                                               and num_nonnulls(t.value_numeric, t.value_text, t.value_bool) > 0))
              then 'threshold_unset'
            else null end as reason,
       (select array_agg(kk order by kk) from unnest(k.keys) kk
         where not exists (select 1 from public.rmth_threshold t
                            where t.municipality_id = i.municipality_id and t.key = kk and t.deleted_at is null
                              and num_nonnulls(t.value_numeric, t.value_text, t.value_bool) > 0)) as missing_keys
  from public.indicator i
  join public.municipality m on m.id = i.municipality_id and m.code = 'RMTH'
  left join (values
    ('IMP-0', array['imp0_sustained_months']),
    ('C1.1',  array['c11_max_weeks', 'c11_min_total_hours']),
    ('SO3-0', array['so30_income_months_of_six']),
    ('F0.2',  array['f02_counting_reading'])) as k(code, keys) on k.code = i.code
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(i.municipality_id));

-- "Cumulative total = COUNT(DISTINCT PA-02) across all periods (a person
-- completing two trainings counts once)" -- C1.2's formula, to each
-- quarter's end, shown beside the quarter's figure.
create or replace view public.v_rmth_indicator_unique as
select 'C1.2'::text as code, rp.code as period_code,
       case when rp.start_date > public.rmth_today() then null
            else (select count(distinct x.person_id) from public.v_rmth_participation_live x
                   where x.municipality_id = m.id and x.completed is true and x.category in ('specialised', 'short_term')
                     and x.end_date <= rp.end_date)
       end::numeric as unique_actual,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
 where m.code = 'RMTH'
   and (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(m.id));

-- ── 5. grants: the leaf and helper views are the gate's, never the client's
revoke all on public.v_rmth_registered, public.v_rmth_activity_live, public.v_rmth_participation_live,
  public.v_ind_rmth_imp_0, public.v_ind_rmth_so1_0, public.v_ind_rmth_a1, public.v_ind_rmth_a0_1,
  public.v_ind_rmth_a0_2, public.v_ind_rmth_b1, public.v_ind_rmth_b1_1, public.v_ind_rmth_b1_2,
  public.v_ind_rmth_so2_0, public.v_ind_rmth_c1, public.v_ind_rmth_c1_1, public.v_ind_rmth_c1_2,
  public.v_ind_rmth_so3_0, public.v_ind_rmth_e0_1, public.v_ind_rmth_e0_2, public.v_ind_rmth_e0_3,
  public.v_ind_rmth_f0_1, public.v_ind_rmth_f0_2
  from public, anon, authenticated;
revoke all on public.v_rmth_indicator_status, public.v_rmth_indicator_unique from public, anon;
grant select on public.v_rmth_indicator_status, public.v_rmth_indicator_unique to authenticated;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_n   int;
  v_bad text;
begin
  -- Sahel Horan's and Khalidiyah's figures, every row, unchanged
  select count(*) into v_n from (
    (select * from _0180_actual_before
     except all
     select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2'))
    union all
    (select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2')
     except all
     select * from _0180_actual_before)) d;
  if v_n <> 0 then
    raise exception '0180: % Sahel Horan / Khalidiyah indicator rows changed', v_n;
  end if;
  -- Ramtha: eighteen codes, every quarter, and every code is a framework row with this view
  select count(*) into v_n from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-0000000000a1';
  if v_n <> 18 * (select count(*) from public.reporting_period where municipality_id = '00000000-0000-4000-8000-0000000000a1') then
    raise exception '0180: % Ramtha rows in v_indicator_actual, expected 18 per period', v_n;
  end if;
  select count(*), string_agg(i.code, ', ') into v_n, v_bad
    from public.indicator i
   where i.municipality_id = '00000000-0000-4000-8000-0000000000a1'
     and (to_regclass('public.' || i.view_name) is null
          or not exists (select 1 from public.v_indicator_actual a where a.municipality_id = i.municipality_id and a.code = i.code));
  if v_n <> 0 then
    raise exception '0180: Ramtha indicators with no view or no rows: %', v_bad;
  end if;
  -- the leaf views are not readable by a client role (0114)
  select count(*), string_agg(c.relname, ', ') into v_n, v_bad
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'v'
     and (c.relname like 'v\_ind\_rmth\_%' or c.relname in ('v_rmth_registered', 'v_rmth_activity_live', 'v_rmth_participation_live'))
     and (has_table_privilege('authenticated', c.oid, 'select') or has_table_privilege('anon', c.oid, 'select'));
  if v_n <> 0 then
    raise exception '0180: client roles can read %', v_bad;
  end if;
  -- four not computable, each naming what it waits on; nothing without a statement
  select count(*) into v_n from public.v_rmth_indicator_status where reason = 'threshold_unset';
  if v_n <> 4 then
    raise exception '0180: % indicators wait on a definition, expected 4 (IMP-0, C1.1, SO3-0, F0.2)', v_n;
  end if;
  if exists (select 1 from public.v_rmth_indicator_status where reason = 'no_statement') then
    raise exception '0180: an indicator has no statement';
  end if;
end $verify$;

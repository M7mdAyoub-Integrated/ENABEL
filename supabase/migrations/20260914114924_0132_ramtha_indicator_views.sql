-- ═══════════════════════════════════════════════════════════════════════════
--  0132 — Ramtha's seventeen indicator views, and what they say when they
--         cannot compute
--
--  One view per indicator with a statement (RMTH-SO1-A1 has none, 0131),
--  each the shape of Sahel Horan's: (period_code, actual, denominator,
--  municipality_id), anchored on `municipality m where m.code = 'RMTH'` and
--  joined to data on municipality_id as well as on date, exactly as 0114
--  anchored the twenty. Each implements the sentence its form sheet gives
--  under "How the indicator is calculated from this form" -- quoted above
--  each view and stored as indicator.formula -- and nothing else.
--
--  ── NOT COMPUTABLE IS NULL, NAMED, NEVER ZERO ──
--
--  Nine of the seventeen read a definition the M&E lead has not given
--  (rmth_threshold, 0123, OQ-47). Where the definition is null the view
--  returns actual NULL and denominator NULL for every period -- a
--  percentage of nothing is not 0% and a count under an undefined rule is
--  not 0 -- and `v_rmth_indicator_status` says which key is missing, so the
--  dashboard can name it. When the lead answers, the figure appears with no
--  migration.
--
--    IMP-0   imp0_sustained_months            SO1-0  so10_employability_threshold
--    SO2-0   so20_self_employment_counts      C1.1   c11_max_weeks + c11_min_hours_per_week
--    C1.2    c12_completion_rule              SO3-0  so30_income_months_of_six
--    E0.3    e03_completion_rule              F0.1   f01_completion_rule
--    F0.2    f02_counting_reading
--
--  C1.2, E0.3 and F0.1 count records where the enumerator answered "met the
--  completion criteria", and that answer is recorded today. They are still
--  held back until the criteria are written, because OQ-47 item 4 is the
--  question of whether two enumerators would answer it the same way -- a
--  figure that moves when the rule is written would already have been
--  reported.
--
--  ── WHAT EACH ONE COUNTS ──
--
--  Records or people, per its sheet, never assumed:
--
--    records   A1.2, A1.3 (events; never summed), B1.1 (programmes), B1.2
--              (proposals, once, on first approval), C1.1 (cycles), C1.2,
--              E0.3, F0.1 (completions -- one person on three cycles is
--              three), E0.1 (incubators), F0.2 (programmes, or deliveries)
--    people    IMP-0, SO1-0, SO3-0, E0.2 -- distinct person_id, attributed to
--              the quarter of the person's FIRST qualifying record
--    ratios    B1, SO2-0, C1 -- numerator over denominator, ×100, one
--              decimal, NULL when the denominator is zero
--
--  C1.2, E0.3 and F0.1 also report unique completers, which their sheets ask
--  for beside the total: `v_rmth_indicator_unique` counts the records whose
--  counted_under_id is null (0127 derives it), so "of whom unique" on the
--  dashboard is the same rule the form shows the enumerator.
--
--  ── THE QUARTER A RECORD FALLS IN ──
--
--    A1.2/A1.3  start_date            B1     interviewed_on
--    B1.1/F0.2  completed_on, else the decision stamp's date
--    B1.2       first_approved_on     C1.1   end_date (a cycle delivered)
--    C1.2/E0.3/F0.1  the cycle's end_date (completion is at the close)
--    SO2-0/C1   contact_date          E0.1   achieved_on
--    E0.2       the person's first admitted_on
--    IMP-0/SO1-0/SO3-0  the person's first qualifying contact_date
--
--  ── v_indicator_actual ──
--
--  Recreated with seventeen more UNION ALL branches. The twenty Sahel Horan
--  branches and the gate are reproduced from the CURRENT definition (0118's,
--  read from the catalogue today), not from 0114's text -- the register's
--  eighth row is exactly the mistake a rebuild from an older migration would
--  make -- and the migration asserts that every Sahel Horan row is unchanged
--  against a copy taken at its start. The leaf views are revoked from every
--  client role (07's step b), and the same assertion 0114 added covers them.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table shm_actual_before as
  select * from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-00000000005a';

-- ── A1.2 · "Count of documented networking events conducted. Each event is
--    counted once. A combined event contributes 1 here AND 1 to A1.3; the two
--    must never be added together." The counting decision is `solely_guidance`
--    = false ("No, it is a networking event, record it here"); undecided does
--    not count.
create view public.v_ind_rmth_a1_2 as
select rp.code as period_code, count(e.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.rmth_event e
    on e.municipality_id = m.id and e.event_kind = 'networking' and e.solely_guidance is false
   and e.deleted_at is null and e.start_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── A1.3 · "Count of documented vocational guidance sessions delivered. Each
--    session is counted once. A session held inside a larger networking event
--    still counts as 1 here."
create view public.v_ind_rmth_a1_3 as
select rp.code as period_code, count(e.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.rmth_event e
    on e.municipality_id = m.id and e.event_kind = 'guidance'
   and e.deleted_at is null and e.start_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── B1 · "Numerator: implementers rating at least one support component
--    'Essential'. Denominator: implementers who received at least one
--    component of municipal support, were approached, and responded. Not
--    reached or refusing are excluded from both. An implementer running
--    several approved projects is counted ONCE. Multiply by 100."
--    `enters_denominator` and `any_essential` are derived by 0127 from the
--    grid and the three conditions (first record, interview completed,
--    something received).
create view public.v_ind_rmth_b1 as
select rp.code as period_code,
       case when count(i.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where i.any_essential) / count(i.id), 1) end as actual,
       count(i.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.rmth_project_implementer i
    on i.municipality_id = m.id and i.enters_denominator is true and i.deleted_at is null
   and i.interviewed_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── B1.1 · "Count of programmes meeting BOTH tests: (a) specialisation is
--    industrial, agricultural or administrative, AND (b) documented as
--    tailored to the technical requirements of at least one approved project.
--    Each programme is counted once." (b) is the tailoring decision; the
--    linked proposals are on rmth_training_programme_proposal.
create view public.v_ind_rmth_b1_1 as
select rp.code as period_code, count(p.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select p.id, p.municipality_id, coalesce(p.completed_on, p.tailoring_met_decided_on::date) as on_date
      from public.rmth_training_programme p
      join public.ref_rmth_b11_specialisation s on s.id = p.specialisation_id
     where p.programme_type = 'specialised' and p.tailoring_met is true and p.deleted_at is null
       and s.code in ('industrial', 'agricultural', 'administrative')
       and exists (select 1 from public.rmth_training_programme_proposal l
                    join public.rmth_proposal pr on pr.id = l.proposal_id and pr.deleted_at is null
                   where l.programme_id = p.id and pr.first_approved_on is not null)
  ) p on p.municipality_id = m.id and p.on_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── B1.2 · "Count of proposals with a decision of 'Approved for
--    implementation' or 'Approved with conditions'. Deferred, rejected or
--    still under review are recorded but not counted. Each proposal is
--    counted once, on first approval." first_approved_on is set by trigger
--    the first time and never moves (0125), so a later rejection does not
--    take the proposal out of the quarter it was counted in.
create view public.v_ind_rmth_b1_2 as
select rp.code as period_code, count(p.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.rmth_proposal p
    on p.municipality_id = m.id and p.first_approved_on is not null and p.deleted_at is null
   and p.first_approved_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── SO2-0 · "Numerator: completers whose placement into EMPLOYMENT OR AN
--    INTERNSHIP started within three months of the cycle end date.
--    Denominator: completers on the C1.2 roster for that cycle who have
--    reached the three-month point and were reached for follow-up. ×100.
--    OPEN ITEM: whether self-employment counts." -- so20_self_employment_counts
create view public.v_ind_rmth_so2_0 as
select rp.code as period_code,
       case when public.rmth_threshold_bool(m.id, 'so20_self_employment_counts') is null then null::numeric
            when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.placed) / count(s.id), 1) end as actual,
       case when public.rmth_threshold_bool(m.id, 'so20_self_employment_counts') is null then null::numeric
            else count(s.id)::numeric end as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s.id, s.municipality_id, s.contact_date,
           (o.code = 'yes_employment'
            or (o.code = 'yes_self_employment'
                and public.rmth_threshold_bool(s.municipality_id, 'so20_self_employment_counts') is true)) as placed
      from public.rmth_outcome_survey s
      join public.ref_rmth_reached r on r.id = s.reached_id and r.code = 'yes'
      left join public.ref_rmth_so20_outcome o on o.id = s.so20_outcome_id
     where s.survey_kind = 'so2_0' and s.deleted_at is null and s.three_month_reached is true
       and exists (select 1 from public.rmth_training_enrolment e
                    where e.person_id = s.person_id and e.cycle_id = s.cycle_id
                      and e.met_criteria is true and e.deleted_at is null)
  ) s on s.municipality_id = m.id and s.contact_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── C1 · "Numerator: trainees answering 'Yes, significantly' or 'Yes, to
--    some extent'. Denominator: trainees on the C1.2 completion roster for
--    the cycle who were approached AND reached. Not reached or refusing are
--    excluded from both. ×100."
create view public.v_ind_rmth_c1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.positive) / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s.id, s.municipality_id, s.contact_date, h.code in ('yes_significantly', 'yes_some') as positive
      from public.rmth_outcome_survey s
      join public.ref_rmth_reached r on r.id = s.reached_id and r.code = 'yes'
      left join public.ref_rmth_so2c1_headline h on h.id = s.headline_id
     where s.survey_kind = 'so2_c1' and s.deleted_at is null
       and exists (select 1 from public.rmth_training_enrolment e
                    where e.person_id = s.person_id and e.cycle_id = s.cycle_id
                      and e.met_criteria is true and e.deleted_at is null)
  ) s on s.municipality_id = m.id and s.contact_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── C1.1 · "Count of cycles meeting BOTH tests: (a) short-term intensive per
--    the agreed definition, and (b) content jointly developed with at least
--    one private sector establishment AND one academic or vocational
--    institution, with documentary evidence. OPEN ITEM: fix the short-term
--    intensive thresholds." (a) is recomputed from the cycle's weeks and
--    hours per week against the two thresholds; (b) is the joint-development
--    decision.
create view public.v_ind_rmth_c1_1 as
select rp.code as period_code,
       case when public.rmth_threshold_numeric(m.id, 'c11_max_weeks') is null
              or public.rmth_threshold_numeric(m.id, 'c11_min_hours_per_week') is null then null::numeric
            else count(c.id)::numeric end as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.rmth_training_cycle c
    on c.municipality_id = m.id and c.cycle_kind = 'employability' and c.deleted_at is null
   and c.joint_development_met is true
   and c.weeks <= public.rmth_threshold_numeric(m.id, 'c11_max_weeks')
   and c.hours_per_week >= public.rmth_threshold_numeric(m.id, 'c11_min_hours_per_week')
   and c.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── C1.2 / E0.3 / F0.1 · "Count of records where 'Did this person meet the
--    completion criteria?' is Yes." Held until the criteria are written
--    (c12/e03/f01_completion_rule). One person on three cycles is three.
create view public.v_ind_rmth_c1_2 as
select rp.code as period_code,
       case when public.rmth_threshold_text(m.id, 'c12_completion_rule') is null then null::numeric
            else count(e.id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select e.id, e.municipality_id, c.end_date
               from public.rmth_training_enrolment e
               join public.rmth_training_cycle c on c.id = e.cycle_id and c.deleted_at is null
              where e.enrolment_kind = 'employability' and e.met_criteria is true and e.deleted_at is null) e
    on e.municipality_id = m.id and e.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

create view public.v_ind_rmth_e0_3 as
select rp.code as period_code,
       case when public.rmth_threshold_text(m.id, 'e03_completion_rule') is null then null::numeric
            else count(e.id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select e.id, e.municipality_id, c.end_date
               from public.rmth_training_enrolment e
               join public.rmth_training_cycle c on c.id = e.cycle_id and c.deleted_at is null
              where e.enrolment_kind = 'incubator_design' and e.met_criteria is true and e.deleted_at is null) e
    on e.municipality_id = m.id and e.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

create view public.v_ind_rmth_f0_1 as
select rp.code as period_code,
       case when public.rmth_threshold_text(m.id, 'f01_completion_rule') is null then null::numeric
            else count(e.id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select e.id, e.municipality_id, c.end_date
               from public.rmth_training_enrolment e
               join public.rmth_training_cycle c on c.id = e.cycle_id and c.deleted_at is null
              where e.enrolment_kind = 'entrepreneurship' and e.met_criteria is true and e.deleted_at is null) e
    on e.municipality_id = m.id and e.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── SO3-0 · "Count of unique persons confirmed to be earning income from a
--    supported enterprise in at least four of the last six months. Counted
--    once per person. OPEN ITEM: confirm the four-of-six rule." Recomputed
--    from months_of_six against the threshold; a person is attributed to the
--    quarter of their first qualifying follow-up.
create view public.v_ind_rmth_so3_0 as
select rp.code as period_code,
       case when public.rmth_threshold_numeric(m.id, 'so30_income_months_of_six') is null then null::numeric
            else count(f.person_id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select s.municipality_id, s.person_id, min(s.contact_date) as first_on
               from public.rmth_outcome_survey s
               join public.person pe on pe.id = s.person_id and pe.deleted_at is null
              where s.survey_kind = 'so3_0' and s.deleted_at is null
                and s.months_of_six >= public.rmth_threshold_numeric(s.municipality_id, 'so30_income_months_of_six')
              group by s.municipality_id, s.person_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── E0.1 · "Count of incubators that are (a) specialised in a high-impact
--    field and (b) confirmed as established and operational against criteria
--    1 to 5. Admission of a first cohort is tracked but NOT required." (a) is
--    a field being recorded -- the statement's list is "such as", so "Other
--    (specify)" is not excluded; (b) is the establishment decision.
create view public.v_ind_rmth_e0_1 as
select rp.code as period_code, count(i.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select i.id, i.municipality_id, i.achieved_on
               from public.rmth_incubator i
               join public.ref_rmth_e01_status st on st.id = i.established_id and st.code = 'achieved'
              where i.field_id is not null and i.deleted_at is null) i
    on i.municipality_id = m.id and i.achieved_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── E0.2 · "Count of unique participants who have received at least one
--    incubation service. Counted once per participant, however many
--    services they receive." Distinct person, attributed to their first
--    admission.
create view public.v_ind_rmth_e0_2 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select s.municipality_id, s.person_id, min(s.admitted_on) as first_on
               from public.rmth_incubation_service s
               join public.person pe on pe.id = s.person_id and pe.deleted_at is null
               join public.rmth_incubator i on i.id = s.incubator_id and i.deleted_at is null
              where s.deleted_at is null
              group by s.municipality_id, s.person_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── F0.2 · "Count of programmes where 'Programme development complete?' is
--    Yes. Each programme is counted once. OPEN ITEM: the Action Plan defines
--    the equivalent as the number of training SESSIONS delivered." The
--    reading is f02_counting_reading: 'programmes' counts programmes on the
--    completion date; 'sessions' counts the delivery log's cycles on their
--    end date.
create view public.v_ind_rmth_f0_2 as
select rp.code as period_code,
       case public.rmth_threshold_text(m.id, 'f02_counting_reading')
            when 'programmes' then count(distinct p.id)::numeric
            when 'sessions' then count(distinct d.id)::numeric
            else null::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select p.id, p.municipality_id, coalesce(p.completed_on, p.development_complete_id_decided_on::date) as on_date
               from public.rmth_training_programme p
               join public.ref_rmth_f02_complete c on c.id = p.development_complete_id and c.code = 'yes'
              where p.programme_type = 'entrepreneurship' and p.deleted_at is null) p
    on p.municipality_id = m.id and p.on_date between rp.start_date and rp.end_date
  left join (select d.id, d.municipality_id, d.end_date
               from public.rmth_training_cycle d
               join public.rmth_training_programme p on p.id = d.programme_id and p.deleted_at is null
              where d.cycle_kind = 'entrepreneurship' and d.deleted_at is null) d
    on d.municipality_id = m.id and d.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── IMP-0 · "A COUNT, not a rate: unique beneficiaries whose engagement is
--    confirmed as sustained for at least X consecutive months. Counted once
--    only." Recomputed from consecutive_months against X, so a recorded
--    criterion that disagrees with the arithmetic is visible; a person is
--    attributed to the quarter of their first qualifying round.
create view public.v_ind_rmth_imp_0 as
select rp.code as period_code,
       case when public.rmth_threshold_numeric(m.id, 'imp0_sustained_months') is null then null::numeric
            else count(f.person_id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select s.municipality_id, s.person_id, min(s.contact_date) as first_on
               from public.rmth_outcome_survey s
               join public.person pe on pe.id = s.person_id and pe.deleted_at is null
              where s.survey_kind = 'imp_0' and s.deleted_at is null
                and s.consecutive_months >= public.rmth_threshold_numeric(s.municipality_id, 'imp0_sustained_months')
              group by s.municipality_id, s.person_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── SO1-0 · "Count of unique persons meeting the employability threshold: a
--    confirmed placement, OR at least one VERIFIABLE action plus one further
--    action. Counted once per person. OPEN ITEM: confirm this threshold --
--    the Action Plan's equivalent counts confirmed employment only."
--    so10_threshold_id is derived by 0127 from the three questions; the
--    reading (form_rule / placement_only) is the open item.
create view public.v_ind_rmth_so1_0 as
select rp.code as period_code,
       case when public.rmth_threshold_text(m.id, 'so10_employability_threshold') is null then null::numeric
            else count(f.person_id)::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select s.municipality_id, s.person_id, min(s.contact_date) as first_on
               from public.rmth_outcome_survey s
               join public.person pe on pe.id = s.person_id and pe.deleted_at is null
               join public.ref_rmth_so10_threshold t on t.id = s.so10_threshold_id
              where s.survey_kind = 'so1_0' and s.deleted_at is null
                and (t.code = 'yes_placement'
                     or (t.code = 'yes_steps'
                         and public.rmth_threshold_text(s.municipality_id, 'so10_employability_threshold') = 'form_rule'))
              group by s.municipality_id, s.person_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
 group by m.id, rp.code;

-- ── unique completers, beside the totals the three completion sheets ask for
create view public.v_rmth_indicator_unique as
select x.code, rp.code as period_code, count(e.id)::numeric as unique_actual, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join (values ('C1.2', 'employability'), ('E0.3', 'incubator_design'), ('F0.1', 'entrepreneurship')) x(code, kind)
  left join (select e.id, e.municipality_id, e.enrolment_kind, c.end_date
               from public.rmth_training_enrolment e
               join public.rmth_training_cycle c on c.id = e.cycle_id and c.deleted_at is null
              where e.met_criteria is true and e.counted_under_id is null and e.deleted_at is null) e
    on e.municipality_id = m.id and e.enrolment_kind = x.kind and e.end_date between rp.start_date and rp.end_date
 where m.code = 'RMTH'
   and (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(m.id))
 group by x.code, m.id, rp.code;

-- ── what the dashboard says about each indicator's computability ─────────
create view public.v_rmth_indicator_status as
select i.municipality_id, i.code, i.full_code,
       case when i.view_name is null then 'no_statement'
            when exists (select 1 from unnest(k.keys) kk
                          where not exists (select 1 from public.rmth_threshold t
                                             where t.municipality_id = i.municipality_id and t.key = kk
                                               and t.deleted_at is null
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
    ('SO1-0', array['so10_employability_threshold']),
    ('SO2-0', array['so20_self_employment_counts']),
    ('C1.1',  array['c11_max_weeks', 'c11_min_hours_per_week']),
    ('C1.2',  array['c12_completion_rule']),
    ('SO3-0', array['so30_income_months_of_six']),
    ('E0.3',  array['e03_completion_rule']),
    ('F0.1',  array['f01_completion_rule']),
    ('F0.2',  array['f02_counting_reading'])) k(code, keys) on k.code = i.code
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(i.municipality_id));

-- ── v_indicator_actual: the twenty, then the seventeen ───────────────────
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
    -- Ramtha (0132)
    union all select 'IMP-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_imp_0
    union all select 'SO1-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so1_0
    union all select 'A1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a1_2
    union all select 'A1.3',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a1_3
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
  ) x
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(municipality_id));

-- ── grants: leaves to nobody, the two exposed views to authenticated ──────
do $grants$
declare v text;
begin
  for v in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'v\_ind\_rmth\_%'
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', v);
  end loop;
end $grants$;
revoke all on public.v_rmth_indicator_unique from public, anon;
grant select on public.v_rmth_indicator_unique to authenticated;
revoke all on public.v_rmth_indicator_status from public, anon;
grant select on public.v_rmth_indicator_status to authenticated;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_rmth  uuid := '00000000-0000-4000-8000-0000000000a1';
  v_n     int;
  v_res   jsonb;
  v_ev    uuid;
  v_before numeric;
  v_after  numeric;
  v_a13_before numeric;
  v_cyc   uuid;
begin
  -- Sahel Horan's rows: not one changed
  if exists (select * from shm_actual_before except select * from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-00000000005a')
     or exists (select * from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-00000000005a' except select * from shm_actual_before) then
    raise exception '0132: a Sahel Horan row of v_indicator_actual changed';
  end if;
  -- every Ramtha indicator with a view has 13 rows; A1 has none
  select count(*) into v_n from public.v_indicator_actual where municipality_id = v_rmth;
  if v_n <> 17 * 13 then raise exception '0132: expected 221 Ramtha rows, got %', v_n; end if;
  if exists (select 1 from public.indicator i where i.municipality_id = v_rmth and i.view_name is not null
               and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                where n.nspname = 'public' and c.relkind = 'v' and c.relname = i.view_name)) then
    raise exception '0132: an indicator names a view that does not exist';
  end if;
  -- no leaf view is reachable by a client role (07 step b), Ramtha's included
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'v\_ind\_%'
                and (has_table_privilege('authenticated', c.oid, 'select') or has_table_privilege('anon', c.oid, 'select'))) then
    raise exception '0132: a leaf indicator view is readable by a client role';
  end if;
  -- the nine that read a null definition are null, not zero, in every period
  if exists (select 1 from public.v_indicator_actual a
              where a.municipality_id = v_rmth and a.code in ('IMP-0','SO1-0','SO2-0','C1.1','C1.2','SO3-0','E0.3','F0.1','F0.2')
                and (a.actual is not null or a.denominator is not null)) then
    raise exception '0132: an indicator with an undecided definition returned a figure';
  end if;
  if (select count(*) from public.v_rmth_indicator_status where reason = 'threshold_unset') <> 9
     or (select count(*) from public.v_rmth_indicator_status where reason = 'no_statement') <> 1
     or (select count(*) from public.v_rmth_indicator_status where reason is null) <> 8 then
    raise exception '0132: the status view does not say 9 unset, 1 without a statement, 8 computable';
  end if;

  -- behaviour, as the Ramtha admin, discarded: A1.2 and A1.3 never count the
  -- same event; a deferred proposal does not count; a soft-deleted record
  -- leaves the figure; and a definition, once written, makes a figure appear
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    select actual into v_before from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.2' and period_code = '27/Q2';
    select actual into v_a13_before from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.3' and period_code = '27/Q2';
    -- a networking event counts once under A1.2 and not under A1.3
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object(
      'event_kind', 'networking', 'title', '0132 probe fair', 'start_date', '2027-05-03', 'end_date', '2027-05-03',
      'event_type_id', (select id from public.ref_rmth_a12_event_type where code = 'job_fair'), 'solely_guidance', false)));
    if (v_res->>'ok')::boolean is not true then raise exception '0132: event insert failed: %', v_res; end if;
    v_ev := (v_res->>'id')::uuid;
    -- a guidance session inside it counts once under A1.3 and not under A1.2
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object(
      'event_kind', 'guidance', 'title', '0132 probe session', 'start_date', '2027-05-03', 'end_date', '2027-05-03', 'parent_event_id', v_ev)));
    if (v_res->>'ok')::boolean is not true then raise exception '0132: session insert failed: %', v_res; end if;
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.2' and period_code = '27/Q2';
    if v_after <> v_before + 1 then raise exception '0132: A1.2 moved by % instead of 1', v_after - v_before; end if;
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.3' and period_code = '27/Q2';
    if v_after <> v_a13_before + 1 then raise exception '0132: A1.3 moved by % instead of 1', v_after - v_a13_before; end if;
    -- an undecided networking event does not count
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object(
      'event_kind', 'networking', 'title', '0132 undecided', 'start_date', '2027-05-04', 'end_date', '2027-05-04',
      'event_type_id', (select id from public.ref_rmth_a12_event_type where code = 'job_fair'))));
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.2' and period_code = '27/Q2';
    if v_after <> v_before + 1 then raise exception '0132: an undecided event was counted'; end if;
    -- soft-deleting the fair takes it out again
    update public.rmth_event set deleted_at = now() where id = v_ev;
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'A1.2' and period_code = '27/Q2';
    if v_after <> v_before then raise exception '0132: a soft-deleted event still counts'; end if;

    -- B1.2: deferred does not count, approval counts on its first-approval date
    select actual into v_before from public.v_indicator_actual where municipality_id = v_rmth and code = 'B1.2' and period_code = '27/Q3';
    v_res := public.save_rmth_record('rmth_proposal', jsonb_build_object('row', jsonb_build_object(
      'title', '0132 probe proposal', 'submitted_by_name', 'x', 'submitter_type_id', (select id from public.ref_rmth_b12_submitter_type limit 1),
      'submitted_on', '2027-07-01', 'decision_id', (select id from public.ref_rmth_b12_decision where code = 'deferred'), 'decided_on', '2027-07-10')));
    if (v_res->>'ok')::boolean is not true then raise exception '0132: proposal insert failed: %', v_res; end if;
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'B1.2' and period_code = '27/Q3';
    if v_after <> v_before then raise exception '0132: a deferred proposal was counted'; end if;
    v_res := public.save_rmth_record('rmth_proposal', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'decision_id', (select id from public.ref_rmth_b12_decision where code = 'approved_conditions'), 'decided_on', '2027-08-01')));
    if (v_res->>'ok')::boolean is not true then raise exception '0132: proposal approval failed: %', v_res; end if;
    select actual into v_after from public.v_indicator_actual where municipality_id = v_rmth and code = 'B1.2' and period_code = '27/Q3';
    if v_after <> v_before + 1 then raise exception '0132: an approval with conditions was not counted'; end if;

    -- C1.2: null until the rule is written; then the completion counts in the cycle's closing quarter
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'employability', 'title', '0132 probe cycle', 'start_date', '2027-08-02', 'end_date', '2027-08-27')));
    v_cyc := (v_res->>'id')::uuid;
    v_res := public.save_rmth_record('rmth_training_enrolment', jsonb_build_object(
      'person', jsonb_build_object('national_id', '399000008', 'full_name', '0132 Probe', 'sex', 'female'),
      'row', jsonb_build_object('cycle_id', v_cyc, 'age_years', 30, 'met_criteria', true,
                                'nationality_id', (select id from public.ref_rmth_nationality where code = 'jordanian'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0132: enrolment insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3') is not null then
      raise exception '0132: C1.2 produced a figure with no completion rule';
    end if;
    reset role;
    update public.rmth_threshold set value_text = 'probe rule', decided_on = current_date where municipality_id = v_rmth and key = 'c12_completion_rule';
    set local role authenticated;
    if (select actual from public.v_indicator_actual where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3') < 1 then
      raise exception '0132: C1.2 did not count the completion once its rule was written';
    end if;
    if (select unique_actual from public.v_rmth_indicator_unique where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3') < 1 then
      raise exception '0132: the unique completer was not counted';
    end if;
    if (select reason from public.v_rmth_indicator_status where municipality_id = v_rmth and code = 'C1.2') is not null then
      raise exception '0132: the status view still says C1.2 is blocked';
    end if;

    reset role;
    raise exception using errcode = 'P0132', message = 'rollback the probe';
  exception
    when sqlstate 'P0132' then null;
  end;
  if exists (select 1 from public.rmth_event where title like '0132 %') or exists (select 1 from public.person where national_id = '399000008')
     or (select value_text from public.rmth_threshold where municipality_id = v_rmth and key = 'c12_completion_rule') is not null then
    raise exception '0132: probe rows survived the rollback';
  end if;
end $verify$;

drop table shm_actual_before;

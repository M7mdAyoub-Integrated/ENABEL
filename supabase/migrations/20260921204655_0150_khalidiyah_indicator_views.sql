-- ═══════════════════════════════════════════════════════════════════════════
--  0150 — Khalidiyah's 21 indicator views, and what they say when they
--         cannot compute
--
--  One view per indicator, the shape of the other forty: (period_code,
--  actual, denominator, municipality_id), anchored on `municipality m where
--  m.code = 'KHLD'` and joined to data on municipality_id as well as on
--  date (0114). Each implements the sentence its form sheet gives under
--  "How the indicator is calculated from this form" -- quoted above each
--  view and stored as indicator.formula (0149) -- and nothing else, with the
--  count gates of plan 5.3 applied exactly where the sheet states them.
--
--  ── WHICH QUESTION IS THE INDICATOR QUESTION ──
--
--  Five calculation lines name a question by number -- IMP-0 "Q15", SO1-0
--  "Q14", SO3-0 "Q12", SO4-0 "Q20", SO1-A2 "Q18" -- and on four of the five
--  sheets that number is not the field the sheet marks INDICATOR QUESTION /
--  INDICATOR TEST / counting condition in its Notes column: IMP-0's is field
--  17 (opportunity_increase), SO1-0's field 17 (q_improved), SO3-0's field
--  11 (activities_count), SO4-0's field 22 (overall_opportunity), SO1-A2's
--  field 21 (minutes_prepared). Only SO2-0's "Q9" lands on its marked field.
--  The MARKED field governs here, because it is the one the enumerator is
--  told is the indicator question and its options are the ones the
--  calculation names; the numbering is recorded as OQ-58.
--
--  ── NOT COMPUTABLE IS NULL, NAMED, NEVER ZERO ──
--
--  SO1-A1 and SO1-B1 read a milestone rule the sheet states over fields that
--  cannot be "In place" (0147, OQ-56): their views return actual NULL and
--  denominator NULL for every period, and v_khld_indicator_status names the
--  broken references. When the M&E lead decides the critical items (an
--  update of khld_milestone_rule), the figure appears with no migration.
--  SO3-E1 and SO3-F1 compute from their rules.
--
--  ── WHAT EACH ONE COUNTS ──
--
--    records    A2 (meetings, minuted, with a partner present), C1 (works
--               items completed, over the priority list), C2 (campaigns
--               with a signed attendance sheet), D1 (activities with a
--               report and a count), F3 (action days with a signed sheet
--               and a task note), H1 (markets with a vendor registration),
--               H2 (vendor participations that attended), G2 (enterprises,
--               one row each, with a support type)
--    money      A3 -- the sum in JOD of contributions received or partly
--               received; pledges never enter the total
--    people     F2 -- distinct volunteers with a participation, attributed
--               to the quarter of the FIRST; D2's "distinct individuals" in
--               v_khld_indicator_unique, only where the register was checked
--    enterprises G1 -- distinct enterprises, attributed to the quarter of
--               the FIRST completed cycle
--    ratios     IMP-0, SO1-0, SO2-0, SO4-0 (responses in the quarter), SO3-0
--               (cumulative: volunteers registered by the quarter's end with
--               two or more verified participations by then, over all
--               registered by then) -- ×100, one decimal, NULL when the
--               denominator is zero
--    milestones A1, B1, E1, F1 -- 1 in the quarter the FIRST verification
--               reading Established falls in, 0 elsewhere (SHM's B1.1 shape)
--
--  ── THE QUARTER A RECORD FALLS IN ──
--
--    A2 meeting_date · A3 date_received, else date_pledged · C1
--    completed_on · C2 campaign_date · D1/D2/SO2-0 the activity's
--    event_date (SO2-0: feedback_date) · F3 date · H1/H2 market_date · G1
--    the last session's date, else recorded_on, else the day recorded · G2
--    first_support_date · F2 the first participation · IMP-0/SO4-0 int_date
--    · SO1-0 resp_date · milestones verif_date
--
--  ── v_indicator_actual ──
--
--  Recreated with 21 more UNION ALL branches. The 37 Sahel Horan and Ramtha
--  branches and the gate are reproduced from the CURRENT definition (0132's,
--  the last to touch it), and the migration asserts that every Sahel Horan
--  and Ramtha row is unchanged against a copy taken at its start. The leaf
--  views are revoked from every client role; supabase/check_municipality_
--  scope.sql passes after this file (every view keys on municipality_id and
--  period_code, none doubles).
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0150_actual_before on commit drop as
  select * from public.v_indicator_actual
   where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000a1');

-- ── IMP-0 · "(No. of respondents answering 'Strongly agree' or 'Agree' to
--    Q15 ÷ total respondents who visited the park at least once in the last
--    12 months) × 100." The marked question is field 17, opportunity_increase;
--    the denominator is field 12 not Never; a refused interview is never a
--    row (0148).
create view public.v_ind_khld_imp_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where ag.code in ('strongly_agree', 'agree')) / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_interaction_survey s
             join public.ref_khld_imp0_visit_freq vf on vf.id = s.visit_freq_id and vf.code <> 'never'
             left join public.ref_khld_agree_scale ag on ag.id = s.opportunity_increase_id)
    on s.municipality_id = m.id and s.deleted_at is null and s.int_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── SO1-0 · "(No. of partner organisations selecting 'Strongly agree' or
--    'Agree' on Q14 ÷ total partner organisations surveyed) × 100." The marked
--    question is field 17, q_improved. One response per partner per round is
--    the table's own rule (0146).
create view public.v_ind_khld_so1_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where ag.code in ('strongly_agree', 'agree')) / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_partner_survey s
             join public.khld_partner p on p.id = s.partner_id and p.deleted_at is null
             join public.ref_khld_agree_scale ag on ag.id = s.q_improved_id)
    on s.municipality_id = m.id and s.deleted_at is null and s.resp_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── the four milestones · "Status = 'Established' when items ... are all In
--    place." khld_milestone_status (0147) evaluates each verification against
--    its rule; the FIRST live verification that reads established places the
--    milestone in its quarter. A rule that cannot be evaluated (A1, B1 today)
--    makes every quarter NULL, never 0.
create view public.v_khld_milestone_quarter as
select m.id as municipality_id, v.milestone_code, min(v.verif_date) as established_on
  from public.municipality m
  join public.khld_milestone_verification v on v.municipality_id = m.id and v.deleted_at is null
 where m.code = 'KHLD'
   and (public.khld_milestone_status(v.id))->>'status' = 'established'
 group by m.id, v.milestone_code;

create view public.v_ind_khld_a1 as
select rp.code as period_code,
       case when r.critical_items is null then null::numeric
            when q.established_on between rp.start_date and rp.end_date then 1::numeric else 0::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_milestone_rule r on r.municipality_id = m.id and r.milestone_code = 'SO1-A1'
  left join public.v_khld_milestone_quarter q on q.municipality_id = m.id and q.milestone_code = 'SO1-A1'
 where m.code = 'KHLD';

create view public.v_ind_khld_b1 as
select rp.code as period_code,
       case when r.critical_items is null then null::numeric
            when q.established_on between rp.start_date and rp.end_date then 1::numeric else 0::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_milestone_rule r on r.municipality_id = m.id and r.milestone_code = 'SO1-B1'
  left join public.v_khld_milestone_quarter q on q.municipality_id = m.id and q.milestone_code = 'SO1-B1'
 where m.code = 'KHLD';

create view public.v_ind_khld_e1 as
select rp.code as period_code,
       case when r.critical_items is null then null::numeric
            when q.established_on between rp.start_date and rp.end_date then 1::numeric else 0::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_milestone_rule r on r.municipality_id = m.id and r.milestone_code = 'SO3-E1'
  left join public.v_khld_milestone_quarter q on q.municipality_id = m.id and q.milestone_code = 'SO3-E1'
 where m.code = 'KHLD';

create view public.v_ind_khld_f1 as
select rp.code as period_code,
       case when r.critical_items is null then null::numeric
            when q.established_on between rp.start_date and rp.end_date then 1::numeric else 0::numeric end as actual,
       null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_milestone_rule r on r.municipality_id = m.id and r.milestone_code = 'SO3-F1'
  left join public.v_khld_milestone_quarter q on q.municipality_id = m.id and q.milestone_code = 'SO3-F1'
 where m.code = 'KHLD';

-- ── A2 · "Cumulative count of documented meetings. ... Count only meetings
--    where Q18 = 'Yes, prepared and filed'." Field 21, minutes_prepared; and
--    field 11's note, "A meeting attended by the Municipality alone is not
--    counted as a coordination meeting": orgs_present must be at least one.
create view public.v_ind_khld_a2 as
select rp.code as period_code, count(c.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_coordination_meeting c
             join public.ref_khld_a2_minutes_prepared mp on mp.id = c.minutes_prepared_id and mp.code = 'yes_filed')
    on c.municipality_id = m.id and c.deleted_at is null and c.orgs_present >= 1
   and c.meeting_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── A3 · "Report the annual total value in JOD by contribution type and by
--    source type. Count only records with status 'Received' or 'Partly
--    received' in the value total; report pledges separately." A quarter's
--    figure is the value received in it; a quarter with none is 0 JOD, which
--    is a sum and not a missing target.
create view public.v_ind_khld_a3 as
select rp.code as period_code, coalesce(sum(c.value_jod), 0)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_contribution c
             join public.ref_khld_a3_status st on st.id = c.status_id and st.code in ('received_full', 'partly_received'))
    on c.municipality_id = m.id and c.deleted_at is null
   and coalesce(c.date_received, c.date_pledged) between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── SO2-0 · "(No. of respondents selecting 'Very satisfied' or 'Satisfied'
--    on Q9 ÷ total respondents surveyed) × 100." Field 9,
--    overall_satisfaction. A response belongs to a live activity.
create view public.v_ind_khld_so2_0 as
select rp.code as period_code,
       case when count(f.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where os.code in ('very_satisfied', 'satisfied')) / count(f.id), 1) end as actual,
       count(f.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_user_feedback f
             join public.khld_activity a on a.id = f.activity_id and a.deleted_at is null
             join public.ref_khld_so20_overall_satisfaction os on os.id = f.overall_satisfaction_id)
    on f.municipality_id = m.id and f.deleted_at is null and f.feedback_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── C1 · "Simple count against the agreed rehabilitation list: number of
--    items with status 'Completed' ÷ number of items on the priority list."
--    actual: items completed in the quarter (field 7 Completed, by
--    completed_on); denominator: the live items on the priority list (field
--    5 Yes), the same list in every quarter -- "the denominator of this
--    indicator is the priority list; additions must be justified".
create view public.v_ind_khld_c1 as
select rp.code as period_code,
       count(w.id)::numeric as actual,
       (select count(*) from public.khld_works_item x
          join public.ref_khld_c1_on_priority_list pl on pl.id = x.on_priority_list_id and pl.code = 'yes'
         where x.municipality_id = m.id and x.deleted_at is null)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_works_item w
             join public.ref_khld_c1_status cs on cs.id = w.status_id and cs.code = 'completed')
    on w.municipality_id = m.id and w.deleted_at is null and w.completed_on between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── C2 · "Number of campaigns conducted. ... Count only campaigns with a
--    signed attendance sheet." Field 21's option, recorded as the declaration
--    (plan 5.3: the declaration decides, the file verifies).
create view public.v_ind_khld_c2 as
select rp.code as period_code, count(c.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_campaign c
    on c.municipality_id = m.id and c.deleted_at is null and c.campaign_date between rp.start_date and rp.end_date
   and exists (select 1 from public.khld_campaign_option o
                 join public.ref_khld_c2_evidence_attached e on e.id = o.option_id
                where o.campaign_id = c.id and o.question_code = 'evidence_attached' and e.code = 'signed_attendance_sheet')
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── D1 · "Cumulative count of events held. ... Count only events with an
--    activity report and either an attendance sheet or a documented count."
--    Field 23's options: 'Activity report' and 'Attendance or count sheet'
--    (the sheet offers the two counts as one option).
create view public.v_ind_khld_d1 as
select rp.code as period_code, count(a.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_activity a
    on a.municipality_id = m.id and a.deleted_at is null and a.event_date between rp.start_date and rp.end_date
   and exists (select 1 from public.khld_activity_option o
                 join public.ref_khld_d1_evidence_attached e on e.id = o.option_id
                where o.activity_id = a.id and o.question_code = 'evidence_attached' and e.code = 'activity_report')
   and exists (select 1 from public.khld_activity_option o
                 join public.ref_khld_d1_evidence_attached e on e.id = o.option_id
                where o.activity_id = a.id and o.question_code = 'evidence_attached' and e.code = 'attendance_or_count_sheet')
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── D2 · "Total recorded participants, summed across events and reported by
--    sex and age band. Report attendance (total participations) and, where
--    the register allows, the number of distinct individuals reached." The
--    total here; distinct individuals in v_khld_indicator_unique. One live
--    sheet per activity (0146), in the activity's quarter.
create view public.v_ind_khld_d2 as
select rp.code as period_code, coalesce(sum(s.total_participants), 0)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_attendance s
             join public.khld_activity a on a.id = s.activity_id and a.deleted_at is null)
    on s.municipality_id = m.id and s.deleted_at is null and a.event_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── SO3-0 · "(No. of volunteers with 2 or more verified participations ÷
--    total registered volunteers) × 100." Cumulative as at the quarter's end:
--    every live volunteer registered by then is in the denominator (the
--    sheet's warning: including those with none), and the numerator is those
--    among them with two or more live, verified participations by then.
create view public.v_ind_khld_so3_0 as
select rp.code as period_code,
       case when count(v.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where (select count(*) from public.khld_volunteer_participation p
                                                          where p.volunteer_id = v.id and p.verified and p.deleted_at is null
                                                            and p.participated_on <= rp.end_date) >= 2) / count(v.id), 1) end as actual,
       count(v.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_volunteer v
             join public.person pe on pe.id = v.person_id and pe.deleted_at is null)
    on v.municipality_id = m.id and v.deleted_at is null and v.reg_date <= rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── F2 · "Unique count of registered volunteers with at least one recorded
--    participation." A volunteer is registered once (0146), so distinct
--    volunteers is distinct people; attributed to the quarter of the first
--    participation.
create view public.v_ind_khld_f2 as
select rp.code as period_code, count(f.volunteer_id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select p.municipality_id, p.volunteer_id, min(p.participated_on) as first_on
               from public.khld_volunteer_participation p
               join public.khld_volunteer v on v.id = p.volunteer_id and v.deleted_at is null
               join public.person pe on pe.id = v.person_id and pe.deleted_at is null
              where p.deleted_at is null
              group by p.municipality_id, p.volunteer_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── F3 · "Cumulative count of action days conducted. ... Count only days
--    with a signed attendance sheet and documented tasks." Field 21's options
--    'Signed attendance sheet with volunteer IDs' and 'Task completion note'.
create view public.v_ind_khld_f3 as
select rp.code as period_code, count(d.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_action_day d
    on d.municipality_id = m.id and d.deleted_at is null and d.date between rp.start_date and rp.end_date
   and exists (select 1 from public.khld_action_day_option o
                 join public.ref_khld_f3_evidence_attached e on e.id = o.option_id
                where o.action_day_id = d.id and o.question_code = 'evidence_attached' and e.code = 'signed_attendance_sheet_with_volunteer_ids')
   and exists (select 1 from public.khld_action_day_option o
                 join public.ref_khld_f3_evidence_attached e on e.id = o.option_id
                where o.action_day_id = d.id and o.question_code = 'evidence_attached' and e.code = 'task_completion_note')
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── SO4-0 · "(No. of producers answering 'Yes, significantly' or 'Yes, to
--    some extent' to Q20 ÷ total producers surveyed) × 100." Field 22,
--    overall_opportunity; and field 4's rule, "Only responses from the
--    producer themselves count towards the indicator": a household member's
--    or an unreached producer's response is in neither figure.
create view public.v_ind_khld_so4_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where oo.code in ('yes_significantly', 'yes_to_some_extent')) / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_producer_survey s
             join public.ref_khld_so40_respondent_is_vendor rv on rv.id = s.respondent_is_vendor_id and rv.code = 'yes'
             join public.khld_vendor vd on vd.id = s.vendor_id and vd.deleted_at is null
             join public.ref_khld_so40_overall_opportunity oo on oo.id = s.overall_opportunity_id)
    on s.municipality_id = m.id and s.deleted_at is null and s.int_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── G1 · "Count of enterprises meeting the completion threshold --
--    attendance at all core sessions." completion is derived (0145); an
--    enterprise counts once, in the quarter its FIRST completed cycle closed
--    -- the last session's date, else the date recorded, else the day the
--    row was made.
create view public.v_ind_khld_g1 as
select rp.code as period_code, count(f.enterprise_id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (select g.municipality_id, g.enterprise_id,
                    min(coalesce(greatest(g.s1_date, g.s2_date, g.s3_date, g.s4_date, g.s5_date), g.recorded_on, g.created_at::date)) as first_on
               from public.khld_guidance_completion g
               join public.khld_enterprise e on e.id = g.enterprise_id and e.deleted_at is null
              where g.completion = 'completed' and g.deleted_at is null
              group by g.municipality_id, g.enterprise_id) f
    on f.municipality_id = m.id and f.first_on between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── G2 · "Unique count of supported enterprises." One live log per
--    enterprise (0146); support_types_count is derived (0145) and "an
--    enterprise with at least one type counts"; the quarter is the date of
--    the first support received.
create view public.v_ind_khld_g2 as
select rp.code as period_code, count(s.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_enterprise_support s
             join public.khld_enterprise e on e.id = s.enterprise_id and e.deleted_at is null)
    on s.municipality_id = m.id and s.deleted_at is null and s.support_types_count >= 1
   and s.first_support_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── H1 · "Cumulative count of market days held. ... Count only markets with
--    an event record and a vendor registration sheet." The gate is data
--    (plan 5.3): a market counts when at least one live SO4-H2 registration
--    names it.
create view public.v_ind_khld_h1 as
select rp.code as period_code, count(k.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.khld_market k
    on k.municipality_id = m.id and k.deleted_at is null and k.market_date between rp.start_date and rp.end_date
   and exists (select 1 from public.khld_vendor_registration r where r.market_id = k.id and r.deleted_at is null)
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── H2 · "Count of registered vendors per market (participations), and a
--    unique count of vendor IDs across all markets." Participations here,
--    only those that attended (field 24: "Only vendors who attended count");
--    unique vendors in v_khld_indicator_unique.
create view public.v_ind_khld_h2 as
select rp.code as period_code, count(r.id)::numeric as actual, null::numeric as denominator, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (public.khld_vendor_registration r
             join public.khld_market k on k.id = r.market_id and k.deleted_at is null
             join public.khld_vendor vd on vd.id = r.vendor_id and vd.deleted_at is null
             join public.ref_khld_h2_attended at on at.id = r.attended_id and at.code in ('whole', 'part'))
    on r.municipality_id = m.id and r.deleted_at is null and k.market_date between rp.start_date and rp.end_date
 where m.code = 'KHLD'
 group by m.id, rp.code;

-- ── the second figures two sheets ask for ─────────────────────────────────
-- D2: "the number of distinct individuals reached, where the register
-- allows" -- total minus the repeat participants identified, only on sheets
-- whose duplicate check was done (khld_attendance_figures, 0147, the same
-- rule the screen shows). H2: "a unique count of vendor IDs across all
-- markets" -- distinct vendors that attended, attributed to their first
-- market. Neither is ever estimated.
create view public.v_khld_indicator_unique as
select x.code, rp.code as period_code,
       case x.code
         when 'D2' then (select coalesce(sum(greatest(s.total_participants - s.repeat_participants, 0)), 0)
                           from public.khld_attendance s
                           join public.khld_activity a on a.id = s.activity_id and a.deleted_at is null
                           join public.ref_khld_d2_duplicate_check dc on dc.id = s.duplicate_check_id and dc.code = 'yes'
                          where s.municipality_id = m.id and s.deleted_at is null and s.repeat_participants is not null
                            and a.event_date between rp.start_date and rp.end_date)
         when 'H2' then (select count(*) from (
                           select r.vendor_id, min(k.market_date) as first_on
                             from public.khld_vendor_registration r
                             join public.khld_market k on k.id = r.market_id and k.deleted_at is null
                             join public.khld_vendor vd on vd.id = r.vendor_id and vd.deleted_at is null
                             join public.ref_khld_h2_attended at on at.id = r.attended_id and at.code in ('whole', 'part')
                            where r.municipality_id = m.id and r.deleted_at is null
                            group by r.vendor_id) f
                          where f.first_on between rp.start_date and rp.end_date)
       end::numeric as unique_actual,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join (values ('D2'), ('H2')) x(code)
 where m.code = 'KHLD'
   and (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(m.id));

-- ── what cannot compute, and why ──────────────────────────────────────────
-- The dashboard reads this beside the figure. A milestone whose rule is
-- undecided (critical_items null) names the references the sheet's rule
-- makes that are not checklist rows -- the same sentence khld_milestone_
-- status gives for one verification -- so the M&E lead sees what to decide.
create view public.v_khld_indicator_status as
select i.municipality_id, i.code, i.full_code,
       case when r.milestone_code is not null and r.critical_items is null then 'rule_not_evaluable'
            else null end as reason,
       case when r.milestone_code is not null and r.critical_items is null
            then (select string_agg(format('%s = %s (%s)', n, coalesce(it.field_code, '?'), coalesce(it.field_type, '?')), ', ' order by n)
                    from unnest(r.source_items) n
                    left join public.khld_milestone_item it on it.milestone_code = r.milestone_code and it.item_no = n
                   where it.field_type is distinct from 'checklist')
            else null end as detail,
       r.milestone_code
  from public.indicator i
  join public.municipality m on m.id = i.municipality_id and m.code = 'KHLD'
  left join public.khld_milestone_rule r
    on r.municipality_id = i.municipality_id
   and r.milestone_code = case i.code when 'A1' then 'SO1-A1' when 'B1' then 'SO1-B1' when 'E1' then 'SO3-E1' when 'F1' then 'SO3-F1' end
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(i.municipality_id));

-- ── v_indicator_actual: the CURRENT definition (0132) plus 21 branches ───
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
    -- Khalidiyah (0150)
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

-- ── grants: leaves to nobody, the two exposed views to authenticated ──────
do $grants$
declare v text;
begin
  for v in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'v' and (c.relname like 'v\_ind\_khld\_%' or c.relname = 'v_khld_milestone_quarter')
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', v);
  end loop;
end $grants$;
revoke all on public.v_khld_indicator_unique from public, anon;
grant select on public.v_khld_indicator_unique to authenticated;
revoke all on public.v_khld_indicator_status from public, anon;
grant select on public.v_khld_indicator_status to authenticated;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_khld  uuid := '00000000-0000-4000-8000-0000000000b2';
  v_n     int;
  v_res   jsonb;
  v_vol   uuid;
  v_vol2  uuid;
  v_cmp   uuid;
  v_act   uuid;
  v_mkt   uuid;
  v_ms    uuid;
  v_ptn   uuid;
  v_nid1  text := '399000980';
  v_nid2  text := '399000981';
  v_nid3  text := '399000982';
begin
  -- Sahel Horan's and Ramtha's rows: not one changed
  if exists (select * from _0150_actual_before except select * from public.v_indicator_actual
              where municipality_id <> v_khld)
     or exists (select * from public.v_indicator_actual where municipality_id <> v_khld except select * from _0150_actual_before) then
    raise exception '0150: a Sahel Horan or Ramtha row of v_indicator_actual changed';
  end if;
  -- every Khalidiyah indicator has 13 rows, and names a view that exists
  select count(*) into v_n from public.v_indicator_actual where municipality_id = v_khld;
  if v_n <> 21 * 13 then raise exception '0150: expected 273 Khalidiyah rows, got %', v_n; end if;
  if exists (select 1 from public.indicator i where i.municipality_id = v_khld
               and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                where n.nspname = 'public' and c.relkind = 'v' and c.relname = i.view_name)) then
    raise exception '0150: an indicator names a view that does not exist';
  end if;
  -- with no records: the two undecided milestones are NULL, every other figure is 0 or NULL-by-empty-denominator, nothing invented
  if exists (select 1 from public.v_indicator_actual where municipality_id = v_khld and code in ('A1', 'B1') and actual is not null) then
    raise exception '0150: an undecided milestone reads a figure';
  end if;
  if exists (select 1 from public.v_indicator_actual where municipality_id = v_khld and code in ('E1', 'F1') and actual <> 0) then
    raise exception '0150: a decided milestone reads established with no verification';
  end if;
  if exists (select 1 from public.v_indicator_actual where municipality_id = v_khld and code in ('IMP-0', 'SO1-0', 'SO2-0', 'SO3-0', 'SO4-0') and actual is not null) then
    raise exception '0150: a ratio with an empty denominator is not NULL';
  end if;
  if exists (select 1 from public.v_indicator_actual where municipality_id = v_khld
              and code not in ('A1', 'B1', 'IMP-0', 'SO1-0', 'SO2-0', 'SO3-0', 'SO4-0') and actual is distinct from 0) then
    raise exception '0150: a count with no records is not 0';
  end if;
  -- the status view names the two broken rules and nothing else
  if (select count(*) from public.v_khld_indicator_status where reason = 'rule_not_evaluable') <> 2
     or (select count(*) from public.v_khld_indicator_status where reason is null) <> 19
     or (select detail from public.v_khld_indicator_status where code = 'A1') !~ 'period_covered' then
    raise exception '0150: the status view does not name the two broken rules';
  end if;
  -- no leaf view is reachable by a client role
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'v' and (c.relname like 'v\_ind\_khld\_%' or c.relname = 'v_khld_milestone_quarter')
                and (has_table_privilege('authenticated', c.oid, 'SELECT') or has_table_privilege('anon', c.oid, 'SELECT'))) then
    raise exception '0150: a Khalidiyah leaf view is readable by a client role';
  end if;

  -- behaviour, as the Khalidiyah admin, discarded: each gate in both
  -- directions -- a record in the excluded state moves nothing, flipped to
  -- the included state it moves by one
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@khalidiyah.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- A2: a minuted meeting with a partner present counts; unminuted, or the Municipality alone, does not
    v_res := public.save_khld_record('khld_coordination_meeting', jsonb_build_object('row', jsonb_build_object(
      'meeting_date', '2027-02-10', 'venue_id', (select id from public.ref_khld_a2_venue where not allows_free_text order by sort_order limit 1),
      'meeting_type_id', (select id from public.ref_khld_a2_meeting_type where not allows_free_text order by sort_order limit 1),
      'convened_by_id', (select id from public.ref_khld_a2_convened_by where not allows_free_text order by sort_order limit 1),
      'chaired_by', 'probe', 'agenda', 'probe', 'orgs_invited', 3, 'orgs_present', 0, 'attendees_total', 4,
      'new_partners_id', (select id from public.ref_khld_a2_new_partners where not allows_free_text order by sort_order limit 1),
      'decisions', 'probe', 'actions_assigned', 'probe',
      'prev_followup_id', (select id from public.ref_khld_a2_prev_followup where not allows_free_text order by sort_order limit 1),
      'contributions_pledged_id', (select id from public.ref_khld_a2_contributions_pledged where not allows_free_text order by sort_order limit 1),
      'minutes_prepared_id', (select id from public.ref_khld_a2_minutes_prepared where code = 'yes_filed'), 'attendance_sheet', true)));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: meeting insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A2' and period_code = '27/Q1') <> 0 then
      raise exception '0150: A2 counted a meeting the Municipality attended alone';
    end if;
    v_res := public.save_khld_record('khld_coordination_meeting', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object('orgs_present', 2)));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A2' and period_code = '27/Q1') <> 1 then
      raise exception '0150: A2 did not count a minuted meeting with partners present';
    end if;
    v_res := public.save_khld_record('khld_coordination_meeting', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'minutes_prepared_id', (select id from public.ref_khld_a2_minutes_prepared where code = 'not_prepared'))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A2' and period_code = '27/Q1') <> 0 then
      raise exception '0150: A2 counted an unminuted meeting';
    end if;

    -- A3: a pledge is not in the total; received is, in the quarter received
    v_res := public.save_khld_record('khld_contribution', jsonb_build_object('row', jsonb_build_object(
      'date_pledged', '2027-02-01', 'status_id', (select id from public.ref_khld_a3_status where code = 'pledged'),
      'contributor_name', 'probe co', 'contributor_type_id', (select id from public.ref_khld_a3_contributor_type where not allows_free_text order by sort_order limit 1),
      'contribution_type_id', (select id from public.ref_khld_a3_contribution_type where code = 'cash_or_financial_grant'),
      'description', 'probe', 'value_jod', 250.500,
      'valuation_basis_id', (select id from public.ref_khld_a3_valuation_basis where not allows_free_text order by sort_order limit 1),
      'municipal_acceptance_id', (select id from public.ref_khld_a3_municipal_acceptance where not allows_free_text order by sort_order limit 1),
      'conditions_id', (select id from public.ref_khld_a3_conditions where not allows_free_text order by sort_order limit 1),
      'acknowledged_id', (select id from public.ref_khld_a3_acknowledged where not allows_free_text order by sort_order limit 1),
      'first_contribution_id', (select id from public.ref_khld_a3_first_contribution where not allows_free_text order by sort_order limit 1),
      'csr_linked_id', (select id from public.ref_khld_a3_csr_linked where not allows_free_text order by sort_order limit 1),
      'source_meeting_id', (select id from public.ref_khld_a3_source_meeting where not allows_free_text order by sort_order limit 1))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: contribution insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A3' and period_code = '27/Q1') <> 0 then
      raise exception '0150: A3 summed a pledge';
    end if;
    v_res := public.save_khld_record('khld_contribution', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'status_id', (select id from public.ref_khld_a3_status where code = 'partly_received'), 'date_received', '2027-05-03')));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A3' and period_code = '27/Q2') <> 250.500
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A3' and period_code = '27/Q1') <> 0 then
      raise exception '0150: A3 did not sum the value in the quarter it was received';
    end if;

    -- D1/D2/SO2-0: an activity counts only with a report AND a count; its sheet's total is D2; its feedback is SO2-0
    v_res := public.save_khld_record('khld_activity', jsonb_build_object(
      'row', jsonb_build_object('event_title', '0150 probe', 'event_date', '2027-04-10',
        'location_id', (select id from public.ref_khld_d1_location where code = 'sports_field'),
        'activity_type_id', (select id from public.ref_khld_d1_activity_type where code = 'sports_activity_or_tournament'),
        'calendar_status_id', (select id from public.ref_khld_d1_calendar_status where code = 'no_ad_hoc_or_one_off'),
        'frequency_type_id', (select id from public.ref_khld_d1_frequency_type where code = 'one_off'),
        'organiser_id', (select id from public.ref_khld_d1_organiser where code = 'municipality_alone'),
        'partner_count', 0, 'content_summary', 'probe', 'participants_planned', 10, 'participants_actual', 12,
        'cash_cost_jod', 0, 'feedback_collected_id', (select id from public.ref_khld_d1_feedback_collected where code = 'no'), 'lessons', 'probe'),
      'option_questions', jsonb_build_array('evidence_attached'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'evidence_attached',
        'option_id', (select id from public.ref_khld_d1_evidence_attached where code = 'activity_report')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: activity insert failed: %', v_res; end if;
    v_act := (v_res->>'id')::uuid;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'D1' and period_code = '27/Q2') <> 0 then
      raise exception '0150: D1 counted an activity with a report but no count';
    end if;
    v_res := public.save_khld_record('khld_activity', jsonb_build_object('id', v_act, 'row', '{}'::jsonb,
      'option_questions', jsonb_build_array('evidence_attached'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'evidence_attached', 'option_id', (select id from public.ref_khld_d1_evidence_attached where code = 'activity_report')),
        jsonb_build_object('question_code', 'evidence_attached', 'option_id', (select id from public.ref_khld_d1_evidence_attached where code = 'attendance_or_count_sheet')))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'D1' and period_code = '27/Q2') <> 1 then
      raise exception '0150: D1 did not count an activity with a report and a count';
    end if;
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act,
        'count_method_id', (select id from public.ref_khld_d2_count_method where code = 'tally_by_activity_station'),
        'counters', 'probe', 'total_participants', 12, 'staff_volunteers', 0, 'repeat_participants', 2,
        'register_attached_id', (select id from public.ref_khld_d2_register_attached where code = 'partly'),
        'consent_informed_id', (select id from public.ref_khld_d2_consent_informed where code = 'no'),
        'photo_consent_id', (select id from public.ref_khld_d2_photo_consent where code = 'no_photographs_taken'),
        'duplicate_check_id', (select id from public.ref_khld_d2_duplicate_check where code = 'yes'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: attendance insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'D2' and period_code = '27/Q2') <> 12
       or (select unique_actual from public.v_khld_indicator_unique where municipality_id = v_khld and code = 'D2' and period_code = '27/Q2') <> 10 then
      raise exception '0150: D2 total or distinct individuals is wrong';
    end if;
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'duplicate_check_id', (select id from public.ref_khld_d2_duplicate_check where code = 'not_yet'), 'repeat_participants', null)));
    if (select unique_actual from public.v_khld_indicator_unique where municipality_id = v_khld and code = 'D2' and period_code = '27/Q2') <> 0 then
      raise exception '0150: distinct individuals were estimated where the register was not checked';
    end if;
    v_res := public.save_khld_record('khld_user_feedback', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act, 'feedback_date', '2027-04-10',
        'collection_mode_id', (select id from public.ref_khld_so20_collection_mode where code = 'short_interview_at_the_exit'),
        'sex_id', (select id from public.ref_khld_sex where code = 'male'),
        'age_group_id', (select id from public.ref_khld_age_group where code = '15_24'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'syrian_registered'),
        'first_visit', true,
        'overall_satisfaction_id', (select id from public.ref_khld_so20_overall_satisfaction where code = 'dissatisfied'),
        'feel_safe_id', (select id from public.ref_khld_so20_feel_safe where code = 'mostly'),
        'feel_welcome_id', (select id from public.ref_khld_yes_fully_partly_no where code = 'yes_fully'),
        'suitable_women_children_id', (select id from public.ref_khld_so20_suitable_women_children where code = 'partly'),
        'participate_freely_id', (select id from public.ref_khld_so20_participate_freely where code = 'yes'),
        'activity_suitable_id', (select id from public.ref_khld_so20_activity_suitable where code = 'very_suitable'),
        'timing_convenient_id', (select id from public.ref_khld_so20_timing_convenient where code = 'yes'),
        'improve_most', 'probe', 'would_return_id', (select id from public.ref_khld_so20_would_return where code = 'yes'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: feedback insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO2-0' and period_code = '27/Q2') <> 0
       or (select denominator from public.v_indicator_actual where municipality_id = v_khld and code = 'SO2-0' and period_code = '27/Q2') <> 1 then
      raise exception '0150: SO2-0 with one dissatisfied response should read 0 of 1';
    end if;
    v_res := public.save_khld_record('khld_user_feedback', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'overall_satisfaction_id', (select id from public.ref_khld_so20_overall_satisfaction where code = 'satisfied'))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO2-0' and period_code = '27/Q2') <> 100.0 then
      raise exception '0150: SO2-0 did not follow the changed answer';
    end if;

    -- F2/SO3-0/C2: two volunteers; a campaign with a signed sheet; one volunteer verified twice
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid1, 'full_name', '0150 Probe One', 'sex', 'female', 'date_of_birth', '1995-01-01'),
      'row', jsonb_build_object('reg_date', '2027-01-15',
        'reg_channel_id', (select id from public.ref_khld_f2_reg_channel where code = 'at_the_municipality'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'affiliation_id', (select id from public.ref_khld_f2_affiliation where code = 'none_individual_volunteer'),
        'transport_id', (select id from public.ref_khld_f2_transport where code = 'yes'),
        'consent_data', true, 'consent_photo', false, 'safety_commitment', true)));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: volunteer insert failed: %', v_res; end if;
    v_vol := (v_res->>'id')::uuid;
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid2, 'full_name', '0150 Probe Two', 'sex', 'male', 'date_of_birth', '1998-01-01'),
      'row', (select jsonb_build_object('reg_date', '2027-01-20', 'reg_channel_id', reg_channel_id, 'nationality_id', nationality_id,
                'disability_id', disability_id, 'neighbourhood_id', neighbourhood_id, 'affiliation_id', affiliation_id,
                'transport_id', transport_id, 'consent_data', true, 'consent_photo', false, 'safety_commitment', true)
                from public.khld_volunteer where id = v_vol)));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: second volunteer failed: %', v_res; end if;
    v_vol2 := (v_res->>'id')::uuid;
    -- two registered, no participations: F2 = 0, SO3-0 = 0 of 2 from 27/Q1 on
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F2' and period_code = '27/Q1') <> 0
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '27/Q1') <> 0
       or (select denominator from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '27/Q1') <> 2
       or (select denominator from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '26/Q4') <> 0 then
      raise exception '0150: F2 or SO3-0 with two registered and no participations is wrong';
    end if;
    v_res := public.save_khld_record('khld_campaign', jsonb_build_object(
      'row', jsonb_build_object('campaign_date', '2027-03-20',
        'lead_organiser_id', (select id from public.ref_khld_c2_lead_organiser where code = 'municipality'),
        'volunteers_total', 2, 'new_volunteers', 0, 'person_hours', 6, 'materials', 'probe', 'outputs', 'probe',
        'safety_briefing_id', (select id from public.ref_khld_c2_safety_briefing where code = 'yes_both'),
        'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'municipal_supervision_id', (select id from public.ref_khld_c2_municipal_supervision where code = 'no'),
        'remaining_work', 'probe'),
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol, 'verified', true),
                                          jsonb_build_object('volunteer_id', v_vol2, 'verified', false))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: campaign insert failed: %', v_res; end if;
    v_cmp := (v_res->>'id')::uuid;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'C2' and period_code = '27/Q1') <> 0 then
      raise exception '0150: C2 counted a campaign without a signed attendance sheet';
    end if;
    v_res := public.save_khld_record('khld_campaign', jsonb_build_object('id', v_cmp, 'row', '{}'::jsonb,
      'option_questions', jsonb_build_array('evidence_attached'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'evidence_attached',
        'option_id', (select id from public.ref_khld_c2_evidence_attached where code = 'signed_attendance_sheet')))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'C2' and period_code = '27/Q1') <> 1 then
      raise exception '0150: C2 did not count a campaign with a signed attendance sheet';
    end if;
    -- F2: both volunteers participated (verified or not) in 27/Q1; SO3-0: neither has two yet
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F2' and period_code = '27/Q1') <> 2
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '27/Q1') <> 0 then
      raise exception '0150: F2 or SO3-0 after one campaign is wrong';
    end if;
    v_res := public.save_khld_record('khld_action_day', jsonb_build_object(
      'row', jsonb_build_object('date', '2027-05-27',
        'location_id', (select id from public.ref_khld_f3_location where code = 'al_khalidiyah_public_park_rehabilitated_section'),
        'linked_kind_id', (select id from public.ref_khld_f3_linked_records where code = 'stand_alone'),
        'called_by_id', (select id from public.ref_khld_f3_called_by where code = 'municipality'),
        'volunteers_total', 1, 'new_registrations', 0, 'person_hours', 3, 'roles_assigned', false,
        'tasks_completed', 'probe', 'materials', 'probe', 'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'supervisor', 'probe', 'remaining_tasks', 'probe'),
      'option_questions', jsonb_build_array('evidence_attached'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'evidence_attached', 'option_id', (select id from public.ref_khld_f3_evidence_attached where code = 'signed_attendance_sheet_with_volunteer_ids')),
        jsonb_build_object('question_code', 'evidence_attached', 'option_id', (select id from public.ref_khld_f3_evidence_attached where code = 'task_completion_note'))),
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol, 'verified', true))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: action day insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F3' and period_code = '27/Q2') <> 1 then
      raise exception '0150: F3 did not count an action day with a signed sheet and a task note';
    end if;
    -- SO3-0 in 27/Q2: one of two volunteers has two verified participations = 50.0; F2 stays in 27/Q1 (first participation)
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '27/Q2') <> 50.0
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F2' and period_code = '27/Q2') <> 0 then
      raise exception '0150: SO3-0 or F2 after the action day is wrong';
    end if;
    -- an unverified second participation does not count for SO3-0
    v_res := public.save_khld_record('khld_action_day', jsonb_build_object('id', v_res->>'id', 'row', '{}'::jsonb,
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol2, 'verified', false))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO3-0' and period_code = '27/Q2') <> 50.0 then
      raise exception '0150: an unverified participation counted towards SO3-0';
    end if;

    -- H1/H2/SO4-0: a market counts once a vendor registers; a registered absentee is no participation
    v_res := public.save_khld_record('khld_market', jsonb_build_object(
      'row', jsonb_build_object('market_name', '0150 probe market', 'market_date', '2027-05-14',
        'occasion_id', (select id from public.ref_khld_h1_occasion where code = 'regular_friday_market_day'),
        'phase_id', (select id from public.ref_khld_h1_phase where code = 'pilot_phase'),
        'location_id', (select id from public.ref_khld_h1_location where code = 'open_central_space'),
        'stalls_offered', 10, 'stalls_occupied', 8, 'applications_received', 12,
        'selection_method_id', (select id from public.ref_khld_h1_selection_method where code = 'open_to_all_who_applied'),
        'fee_charged', false, 'accessibility_id', (select id from public.ref_khld_h1_accessibility where code = 'fully_accessible'),
        'visitors_estimated', 200, 'hygiene_check_id', (select id from public.ref_khld_h1_hygiene_check where code = 'no_not_carried_out'),
        'total_sales_jod', 0, 'cash_cost_jod', 0,
        'feedback_collected_id', (select id from public.ref_khld_h1_feedback_collected where code = 'no'), 'lessons', 'probe')));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: market insert failed: %', v_res; end if;
    v_mkt := (v_res->>'id')::uuid;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'H1' and period_code = '27/Q2') <> 0 then
      raise exception '0150: H1 counted a market with no vendor registration';
    end if;
    v_res := public.save_khld_record('khld_vendor_registration', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid3, 'full_name', '0150 Probe Vendor', 'sex', 'female', 'phone', '0790000152', 'date_of_birth', '1985-01-01'),
      'row', jsonb_build_object('market_id', v_mkt,
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'vendor_type_id', (select id from public.ref_khld_h2_vendor_type where code = 'home_based_food_business'),
        'licensed_id', (select id from public.ref_khld_h2_licensed where code = 'no'),
        'health_certificate_id', (select id from public.ref_khld_h2_health_certificate where code = 'no'),
        'first_organised_market', true,
        'nominated_by_id', (select id from public.ref_khld_h2_nominated_by where code = 'invited_by_the_municipality'),
        'stall_number', 'A3', 'stall_free', true,
        'commitment_signed_id', (select id from public.ref_khld_h2_commitment_signed where code = 'yes'),
        'attended_id', (select id from public.ref_khld_h2_attended where code = 'absent'), 'attended_other', 'ill',
        'consent_id', (select id from public.ref_khld_h2_consent where code = 'yes_to_both'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: vendor registration failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'H1' and period_code = '27/Q2') <> 1
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'H2' and period_code = '27/Q2') <> 0
       or (select unique_actual from public.v_khld_indicator_unique where municipality_id = v_khld and code = 'H2' and period_code = '27/Q2') <> 0 then
      raise exception '0150: H1 or H2 with a registered absentee is wrong';
    end if;
    v_res := public.save_khld_record('khld_vendor_registration', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'attended_id', (select id from public.ref_khld_h2_attended where code = 'part'), 'attended_other', null)));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: vendor update failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'H2' and period_code = '27/Q2') <> 1
       or (select unique_actual from public.v_khld_indicator_unique where municipality_id = v_khld and code = 'H2' and period_code = '27/Q2') <> 1 then
      raise exception '0150: H2 did not count an attending vendor';
    end if;
    v_res := public.save_khld_record('khld_producer_survey', jsonb_build_object('row', jsonb_build_object(
      'int_date', '2027-06-01', 'mode_id', (select id from public.ref_khld_so40_mode where code = 'telephone'), 'enumerator', 'probe',
      'respondent_is_vendor_id', (select id from public.ref_khld_so40_respondent_is_vendor where code = 'no_household_member'),
      'vendor_id', (select id from public.khld_vendor limit 1),
      'sex_id', (select id from public.ref_khld_sex where code = 'female'), 'age_group_id', (select id from public.ref_khld_age_group where code = '35_49'),
      'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'), 'markets_count', 1,
      'first_organised_market_id', (select id from public.ref_khld_so40_first_organised_market order by sort_order limit 1),
      'exposure_id', (select id from public.ref_khld_so40_exposure order by sort_order limit 1),
      'made_sales_id', (select id from public.ref_khld_so40_made_sales order by sort_order limit 1),
      'sales_last_market_id', (select id from public.ref_khld_sales_band order by sort_order limit 1),
      'new_customers_id', (select id from public.ref_khld_so40_new_customers order by sort_order limit 1),
      'repeat_orders_id', (select id from public.ref_khld_so40_repeat_orders order by sort_order limit 1),
      'overall_opportunity_id', (select id from public.ref_khld_so40_overall_opportunity where code = 'yes_significantly'),
      'production_change_id', (select id from public.ref_khld_so40_production_change order by sort_order limit 1),
      'still_active_id', (select id from public.ref_khld_so40_still_active where code = 'yes_at_the_same_level'),
      'stop_reason_id', (select id from public.ref_khld_so40_stop_reason where code = 'not_applicable'),
      'guidance_received_id', (select id from public.ref_khld_so40_guidance_received order by sort_order limit 1),
      'participate_again_id', (select id from public.ref_khld_so40_participate_again order by sort_order limit 1),
      'recontact_id', (select id from public.ref_khld_recontact where code = 'no'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: producer survey insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO4-0' and period_code = '27/Q2') is not null then
      raise exception '0150: a household member''s response entered SO4-0';
    end if;
    v_res := public.save_khld_record('khld_producer_survey', jsonb_build_object('id', v_res->>'id', 'row', jsonb_build_object(
      'respondent_is_vendor_id', (select id from public.ref_khld_so40_respondent_is_vendor where code = 'yes'))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'SO4-0' and period_code = '27/Q2') <> 100.0 then
      raise exception '0150: SO4-0 did not count the producer''s own response';
    end if;

    -- F1: a verification reading established places the milestone in its quarter; A1 stays NULL with its reason
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object(
      'row', jsonb_build_object('milestone_code', 'SO3-F1', 'verif_date', '2027-04-15', 'verif_by', 'probe', 'gaps', 'probe'),
      'checklist', jsonb_build_array(
        jsonb_build_object('item_no', 3, 'field_code', 'procedures_approved', 'status_id', (select id from public.ref_khld_f1_procedures_approved where code = 'in_place_decision_no_and_date')),
        jsonb_build_object('item_no', 5, 'field_code', 'database_established', 'status_id', (select id from public.ref_khld_f1_database_established where code = 'in_place')),
        jsonb_build_object('item_no', 7, 'field_code', 'registration_form', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')),
        jsonb_build_object('item_no', 9, 'field_code', 'assignment_procedure', 'status_id', (select id from public.ref_khld_checklist_status where code = 'partly')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: milestone insert failed: %', v_res; end if;
    v_ms := (v_res->>'id')::uuid;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F1' and period_code = '27/Q2') <> 0 then
      raise exception '0150: F1 read established from a partly established verification';
    end if;
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object('id', v_ms, 'row', '{}'::jsonb,
      'checklist', jsonb_build_array(
        jsonb_build_object('item_no', 3, 'field_code', 'procedures_approved', 'status_id', (select id from public.ref_khld_f1_procedures_approved where code = 'in_place_decision_no_and_date')),
        jsonb_build_object('item_no', 5, 'field_code', 'database_established', 'status_id', (select id from public.ref_khld_f1_database_established where code = 'in_place')),
        jsonb_build_object('item_no', 7, 'field_code', 'registration_form', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')),
        jsonb_build_object('item_no', 9, 'field_code', 'assignment_procedure', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')))));
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F1' and period_code = '27/Q2') <> 1
       or (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'F1' and period_code = '27/Q3') <> 0 then
      raise exception '0150: F1 did not place the established milestone in its quarter alone';
    end if;
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object(
      'row', jsonb_build_object('milestone_code', 'SO1-A1', 'verif_date', '2027-04-15', 'verif_by', 'probe', 'gaps', 'probe')));
    if (v_res->>'ok')::boolean is not true then raise exception '0150: A1 verification insert failed: %', v_res; end if;
    if (select actual from public.v_indicator_actual where municipality_id = v_khld and code = 'A1' and period_code = '27/Q2') is not null
       or (select reason from public.v_khld_indicator_status where code = 'A1') <> 'rule_not_evaluable' then
      raise exception '0150: A1 computed a figure under an undecided rule';
    end if;

    -- and the three views the app reads answer the Khalidiyah admin as they answer the other two
    if (select count(*) from public.v_indicator_progress where municipality_id = v_khld) <> 273
       or (select count(*) from public.v_khld_indicator_status) <> 21
       or (select count(*) from public.v_khld_indicator_unique) <> 26 then
      raise exception '0150: the exposed views do not answer the Khalidiyah admin in full';
    end if;

    reset role;
    raise exception using errcode = 'P0150', message = 'rollback the probe';
  exception
    when sqlstate 'P0150' then null;
  end;

  if exists (select 1 from public.person where national_id in (v_nid1, v_nid2, v_nid3))
     or exists (select 1 from public.khld_activity) or exists (select 1 from public.khld_market)
     or exists (select 1 from public.khld_volunteer) or exists (select 1 from public.khld_milestone_verification)
     or exists (select 1 from public.khld_coordination_meeting) or exists (select 1 from public.khld_contribution) then
    raise exception '0150: probe rows survived the rollback';
  end if;
end $verify$;

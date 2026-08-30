-- ═══════════════════════════════════════════════════════════════════════════
--  0072 — a draft survey must not count
--
--  ── THE DEFECT ──
--
--  v_ind_a1, v_ind_b1, v_ind_c1 and v_ind_imp_0 are the only four indicators
--  fed by followup_survey, and not one of them looked at `status`. Each
--  filtered `deleted_at is null` plus its own answer column, and nothing else.
--
--  `status` DOES appear in all four definitions -- in the column list of the
--  subquery, as `s_1.status`, because the subquery selects the whole row. A
--  grep, or an ilike '%status%' against pg_get_viewdef, returns true on all
--  four and means nothing. The filter was never there.
--
--  So a half-finished interview counted. An enumerator part-way through a
--  survey, with q08 answered and the rest blank, moved A1 -- and A1 is a
--  PERCENTAGE, so one premature draft does not add a little, it drags the
--  whole figure toward whatever that one answer happened to be.
--
--  ── WHY 'submitted' AND 'approved', NOT 'submitted' ALONE ──
--
--  `status` is record_status_t: draft, submitted, approved, rejected. The
--  lifecycle in practice is draft -> submitted: fu_update lets an enumerator
--  write only while `status = 'draft'`, and a coordinator write at any status.
--
--  Nothing restricts a coordinator to those two, so `approved` is reachable.
--  Filtering to `submitted` alone would mean a coordinator approving a survey
--  silently removed it from four indicators -- a figure moving DOWN because
--  someone confirmed the data was good. Both terminal-positive states count;
--  draft and rejected do not.
--
--  ── EVERYTHING ELSE IS UNCHANGED ──
--
--  Same columns, same numerators, same period join, same C1 six-month
--  initiative rule, same IMP-0 twelve-month restriction. The only difference in
--  each of the four is one added line in the inner WHERE.
-- ═══════════════════════════════════════════════════════════════════════════

-- A1 — participants applying what they learned.
create or replace view public.v_ind_a1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q08_applied_knowledge = any (array['regularly','occasionally'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.*
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.q08_applied_knowledge is not null
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

-- B1 — of those who used the coordination office, how many found the advice useful.
create or replace view public.v_ind_b1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q16_advice_useful = any (array['very','somewhat'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.*
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.q14_used_office is true
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

-- C1 — initiatives still operating six months on. The EXISTS clause is what
-- makes "six months on" true of the initiative rather than of the interview.
create or replace view public.v_ind_c1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q17_activity_status = any (array['expanded','same','reduced'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.*
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.q17_activity_status is not null
       and exists (
         select 1 from production_initiative pi
          where pi.person_id = s.person_id
            and pi.deleted_at is null
            and pi.started_on <= (s.contact_date - interval '6 mons')
       )
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

-- IMP-0 — still engaged in agriculture or food production at twelve months.
create or replace view public.v_ind_imp_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q37_still_engaged = any (array['main','secondary'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.*
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.round = 'twelve_month'::followup_round_t
       and s.q37_still_engaged is not null
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

comment on view public.v_ind_a1 is
  'Percentage applying what they learned. Counts submitted and approved '
  'surveys only -- a draft used to count, and on a percentage one premature '
  'draft drags the whole figure. See 0072.';
comment on view public.v_ind_b1 is
  'Percentage finding office advice useful. Submitted and approved only, per 0072.';
comment on view public.v_ind_c1 is
  'Percentage of initiatives still operating six months on. Submitted and '
  'approved only, per 0072.';
comment on view public.v_ind_imp_0 is
  'Percentage still engaged at twelve months. Submitted and approved only, per 0072.';

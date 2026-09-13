-- ═══════════════════════════════════════════════════════════════════════════
--  0113 — unique keys include the municipality; children cannot disagree
--         with their parent about which one they are in
--
--  ── PART A: UNIQUE INDEXES (plan §1.4) ──
--
--  Every unique key that one municipality could collide with the other's now
--  leads with `municipality_id`. Twelve are rebuilt:
--
--      objective (code)                  → (municipality_id, code)
--      activity (code)                   → (municipality_id, code)
--      indicator (code)                  → (municipality_id, code)
--      reporting_period (code)           → (municipality_id, code)
--      milestone (code)                  → (municipality_id, code)
--      partner (name, unit)              → (municipality_id, name, unit)
--      partnership (partner_id, type) live
--      training_enrolment (person, session) live
--      advisory_enrolment (person, session) live
--      exhibition_registration (exhibition, person) live
--      followup_survey (person, round) live
--      coordination_meeting_partner (meeting, partnership-or-name)
--
--  The five framework and milestone codes are the ones that WOULD collide:
--  both programmes have an `IMP-0`, an `A1.2`, a `B1.1`, a `27/Q1`. Ramtha's
--  short codes are kept in the same shape as Sahel Horan's rather than
--  prefixed, because the full code — `RMTH-SO1-A1.2` — is derived from the
--  municipality and objective rows (0116 adds `indicator.full_code` for
--  exactly that), and a code that carries its municipality twice is a code
--  that can be written inconsistently.
--
--  `partner (name, unit)` was left GLOBAL on 27 August (OQ-24) so that a
--  soft-deleted partner is restored rather than recreated — G0.4 counts
--  distinct partners, and recreating one moves a reported figure. That
--  argument holds WITHIN a municipality and is unchanged: the index is still
--  not partial. It simply no longer stops Ramtha having a partner of the same
--  name as one of Sahel Horan's, which was never a duplicate.
--
--  Left exactly as they are, and why:
--
--    client_uuid on six tables — a v4 uuid generated on the device; it cannot
--      collide across municipalities and OQ-24 records why it must stay
--      global (a re-syncing phone must not resurrect a withdrawn application
--      under a second key).
--    partner_contribution_one_per_entity (entity_type, entity_id) — keyed on
--      the parent's uuid.
--    followup_buyer_connection (survey_id, seq) — keyed on the parent's uuid.
--    the primary keys of the seven child tables, indicator_target and
--      indicator_snapshot — all lead with a uuid that is itself scoped. Moving
--      `municipality_id` in front of `survey_id` would take the index away
--      from every `where survey_id = …` in the five section-save functions
--      for no gain in uniqueness.
--    person.national_id, person.auth_user_id — person is shared; that is the
--      point of sharing it.
--    every ref_*.code — shared vocabulary.
--
--  ── PART B: COMPOSITE FOREIGN KEYS ──
--
--  0112 gave every scoped child a `municipality_id` of its own, filled by the
--  actor's municipality. Nothing yet stops a row from carrying a different
--  municipality from the parent it hangs off — a training enrolment in Ramtha
--  on a Sahel Horan session, say. A trigger per table could check it; a
--  composite foreign key checks it with no code:
--
--      foreign key (session_id, municipality_id)
--        references training_session (id, municipality_id)
--
--  which needs `unique (id, municipality_id)` on the parent — redundant with
--  the primary key, and the price of the guarantee. Twenty-eight such keys, on
--  every parent→child edge inside the scoped set. The existing single-column
--  foreign keys stay; these are additional, and every one is indexed already
--  by 0112's `<table>_municipality_idx` plus the original FK index.
--
--  A nullable parent column (`indicator.activity_id`, `case_study.
--  initiative_id`, the `matched_*` pair on linkage_request, the two
--  `delivered_by_partnership_id`s, `coordination_meeting_partner.
--  partnership_id`) uses the default MATCH SIMPLE: a null parent is not
--  checked, a present one must agree.
--
--  ── WHAT DOES NOT MOVE ──
--
--  No figure. The verification block compares `v_indicator_actual` before and
--  after, as 0112 did.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table baseline_0113 as
  select code, period_code, actual, denominator from public.v_indicator_actual;

-- ── A. unique indexes ────────────────────────────────────────────────────

-- The five `code` keys are CONSTRAINTS (`<t>_code_key`) and the seeds use
-- `on conflict (code)`; from here on a seed says `on conflict (municipality_id, code)`.
alter table public.objective        drop constraint objective_code_key,
                                    add constraint objective_municipality_code_key unique (municipality_id, code);
alter table public.activity         drop constraint activity_code_key,
                                    add constraint activity_municipality_code_key unique (municipality_id, code);
alter table public.indicator        drop constraint indicator_code_key,
                                    add constraint indicator_municipality_code_key unique (municipality_id, code);
alter table public.reporting_period drop constraint reporting_period_code_key,
                                    add constraint reporting_period_municipality_code_key unique (municipality_id, code);
alter table public.milestone        drop constraint milestone_code_key,
                                    add constraint milestone_municipality_code_key unique (municipality_id, code);

alter table public.partner drop constraint partner_name_unique,
  add constraint partner_name_unique unique nulls not distinct (municipality_id, name, unit);

drop index public.partnership_partner_type_live;
create unique index partnership_partner_type_live
  on public.partnership (municipality_id, partner_id, partnership_type) where deleted_at is null;

drop index public.training_enrolment_person_session_live;
create unique index training_enrolment_person_session_live
  on public.training_enrolment (municipality_id, person_id, session_id) where deleted_at is null;

drop index public.advisory_enrolment_person_session_live;
create unique index advisory_enrolment_person_session_live
  on public.advisory_enrolment (municipality_id, person_id, session_id) where deleted_at is null;

drop index public.exhibition_registration_exhibition_person_live;
create unique index exhibition_registration_exhibition_person_live
  on public.exhibition_registration (municipality_id, exhibition_id, person_id) where deleted_at is null;

drop index public.followup_survey_person_round_live;
create unique index followup_survey_person_round_live
  on public.followup_survey (municipality_id, person_id, round) where deleted_at is null;

drop index public.coordination_meeting_partner_uniq;
create unique index coordination_meeting_partner_uniq
  on public.coordination_meeting_partner (municipality_id, meeting_id, coalesce(partnership_id::text, external_name));

-- ── B. composite foreign keys ────────────────────────────────────────────

-- parents: (id, municipality_id) must be referenceable
alter table public.objective              add constraint objective_id_municipality_key              unique (id, municipality_id);
alter table public.activity               add constraint activity_id_municipality_key               unique (id, municipality_id);
alter table public.indicator              add constraint indicator_id_municipality_key              unique (id, municipality_id);
alter table public.reporting_period       add constraint reporting_period_id_municipality_key       unique (id, municipality_id);
alter table public.partner                add constraint partner_id_municipality_key                unique (id, municipality_id);
alter table public.partnership            add constraint partnership_id_municipality_key            unique (id, municipality_id);
alter table public.training_session       add constraint training_session_id_municipality_key       unique (id, municipality_id);
alter table public.advisory_session       add constraint advisory_session_id_municipality_key       unique (id, municipality_id);
alter table public.exhibition             add constraint exhibition_id_municipality_key             unique (id, municipality_id);
alter table public.exhibition_registration add constraint exhibition_registration_id_municipality_key unique (id, municipality_id);
alter table public.production_initiative  add constraint production_initiative_id_municipality_key  unique (id, municipality_id);
alter table public.market_linkage         add constraint market_linkage_id_municipality_key         unique (id, municipality_id);
alter table public.coordination_meeting   add constraint coordination_meeting_id_municipality_key   unique (id, municipality_id);
alter table public.followup_survey        add constraint followup_survey_id_municipality_key        unique (id, municipality_id);

-- children: the parent must be in the same municipality
alter table public.activity add constraint activity_objective_municipality_fkey
  foreign key (objective_id, municipality_id) references public.objective (id, municipality_id);
alter table public.indicator add constraint indicator_objective_municipality_fkey
  foreign key (objective_id, municipality_id) references public.objective (id, municipality_id);
alter table public.indicator add constraint indicator_activity_municipality_fkey
  foreign key (activity_id, municipality_id) references public.activity (id, municipality_id);
alter table public.indicator_target add constraint indicator_target_indicator_municipality_fkey
  foreign key (indicator_id, municipality_id) references public.indicator (id, municipality_id);
alter table public.indicator_target add constraint indicator_target_period_municipality_fkey
  foreign key (period_id, municipality_id) references public.reporting_period (id, municipality_id);
alter table public.indicator_snapshot add constraint indicator_snapshot_indicator_municipality_fkey
  foreign key (indicator_id, municipality_id) references public.indicator (id, municipality_id);
alter table public.indicator_snapshot add constraint indicator_snapshot_period_municipality_fkey
  foreign key (period_id, municipality_id) references public.reporting_period (id, municipality_id);
alter table public.partnership add constraint partnership_partner_municipality_fkey
  foreign key (partner_id, municipality_id) references public.partner (id, municipality_id);
alter table public.partnership_role add constraint partnership_role_partnership_municipality_fkey
  foreign key (partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.partner_contribution add constraint partner_contribution_partnership_municipality_fkey
  foreign key (partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.training_session add constraint training_session_partnership_municipality_fkey
  foreign key (delivered_by_partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.advisory_session add constraint advisory_session_partnership_municipality_fkey
  foreign key (delivered_by_partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.training_enrolment add constraint training_enrolment_session_municipality_fkey
  foreign key (session_id, municipality_id) references public.training_session (id, municipality_id);
alter table public.advisory_enrolment add constraint advisory_enrolment_session_municipality_fkey
  foreign key (session_id, municipality_id) references public.advisory_session (id, municipality_id);
alter table public.exhibition_registration add constraint exhibition_registration_exhibition_municipality_fkey
  foreign key (exhibition_id, municipality_id) references public.exhibition (id, municipality_id);
alter table public.exhibition_registration_product add constraint exhibition_registration_product_registration_municipality_fkey
  foreign key (registration_id, municipality_id) references public.exhibition_registration (id, municipality_id);
alter table public.mentorship_session add constraint mentorship_session_initiative_municipality_fkey
  foreign key (initiative_id, municipality_id) references public.production_initiative (id, municipality_id);
alter table public.market_linkage add constraint market_linkage_initiative_municipality_fkey
  foreign key (initiative_id, municipality_id) references public.production_initiative (id, municipality_id);
alter table public.market_linkage add constraint market_linkage_partnership_municipality_fkey
  foreign key (partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.linkage_request add constraint linkage_request_initiative_municipality_fkey
  foreign key (matched_initiative_id, municipality_id) references public.production_initiative (id, municipality_id);
alter table public.linkage_request add constraint linkage_request_linkage_municipality_fkey
  foreign key (matched_linkage_id, municipality_id) references public.market_linkage (id, municipality_id);
alter table public.case_study add constraint case_study_initiative_municipality_fkey
  foreign key (initiative_id, municipality_id) references public.production_initiative (id, municipality_id);
alter table public.coordination_meeting_partner add constraint coordination_meeting_partner_meeting_municipality_fkey
  foreign key (meeting_id, municipality_id) references public.coordination_meeting (id, municipality_id);
alter table public.coordination_meeting_partner add constraint coordination_meeting_partner_partnership_municipality_fkey
  foreign key (partnership_id, municipality_id) references public.partnership (id, municipality_id);
alter table public.followup_answer add constraint followup_answer_survey_municipality_fkey
  foreign key (survey_id, municipality_id) references public.followup_survey (id, municipality_id);
alter table public.followup_answer_option add constraint followup_answer_option_survey_municipality_fkey
  foreign key (survey_id, municipality_id) references public.followup_survey (id, municipality_id);
alter table public.followup_safety_item add constraint followup_safety_item_survey_municipality_fkey
  foreign key (survey_id, municipality_id) references public.followup_survey (id, municipality_id);
alter table public.followup_buyer_connection add constraint followup_buyer_connection_survey_municipality_fkey
  foreign key (survey_id, municipality_id) references public.followup_survey (id, municipality_id);

-- ── verification ─────────────────────────────────────────────────────────

do $verify$
declare
  v_bad text[];
  v_n int;
  v_diff bigint;
begin
  -- the twelve rebuilt unique indexes all lead with municipality_id
  select array_agg(ic.relname) into v_bad
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_class c  on c.oid  = i.indrelid
   where ic.relname in (
     'objective_municipality_code_key', 'activity_municipality_code_key',
     'indicator_municipality_code_key', 'reporting_period_municipality_code_key',
     'milestone_municipality_code_key', 'partner_name_unique',
     'partnership_partner_type_live', 'training_enrolment_person_session_live',
     'advisory_enrolment_person_session_live',
     'exhibition_registration_exhibition_person_live',
     'followup_survey_person_round_live', 'coordination_meeting_partner_uniq')
     and not (i.indisunique
              and (select a.attname from pg_attribute a
                    where a.attrelid = c.oid and a.attnum = i.indkey[0]) = 'municipality_id');
  if v_bad is not null then
    raise exception '0113: not unique-on-municipality: %', v_bad;
  end if;

  select count(*) into v_n
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
   where ic.relname in (
     'objective_municipality_code_key', 'activity_municipality_code_key',
     'indicator_municipality_code_key', 'reporting_period_municipality_code_key',
     'milestone_municipality_code_key', 'partner_name_unique',
     'partnership_partner_type_live', 'training_enrolment_person_session_live',
     'advisory_enrolment_person_session_live',
     'exhibition_registration_exhibition_person_live',
     'followup_survey_person_round_live', 'coordination_meeting_partner_uniq');
  if v_n <> 12 then
    raise exception '0113: expected 12 rebuilt unique indexes, found %', v_n;
  end if;

  -- 28 composite foreign keys, every one two-column and ending on municipality_id
  select count(*) into v_n
    from pg_constraint k
   where k.contype = 'f' and k.conname like '%\_municipality\_fkey'
     and k.connamespace = 'public'::regnamespace
     and array_length(k.conkey, 1) = 2
     and (select a.attname from pg_attribute a
           where a.attrelid = k.conrelid and a.attnum = k.conkey[2]) = 'municipality_id';
  if v_n <> 28 then
    raise exception '0113: expected 28 composite municipality foreign keys, found %', v_n;
  end if;

  -- and not one figure moved
  select count(*) into v_diff from (
    (select code, period_code, actual, denominator from baseline_0113
     except
     select code, period_code, actual, denominator from public.v_indicator_actual)
    union all
    (select code, period_code, actual, denominator from public.v_indicator_actual
     except
     select code, period_code, actual, denominator from baseline_0113)) d;
  if v_diff <> 0 then
    raise exception '0113: v_indicator_actual changed — % rows differ', v_diff;
  end if;
end $verify$;

drop table baseline_0113;

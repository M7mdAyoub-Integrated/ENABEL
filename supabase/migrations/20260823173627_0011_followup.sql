-- 0011 followup
create table public.followup_survey (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.person(id),
  round           followup_round_t not null,
  contact_date    date,
  contact_mode    contact_mode_t,
  enumerator_name text,
  respondent      respondent_t not null,
  status          record_status_t not null default 'draft',

  -- Section A, feeds A1 and B1
  q08_applied_knowledge text check (q08_applied_knowledge in ('regularly','occasionally','no')),
  q14_used_office       boolean,
  q16_advice_useful     text check (q16_advice_useful in ('very','somewhat','not_very','not_at_all')),

  -- Section B, feeds C1
  q17_activity_status   text check (q17_activity_status in
                          ('expanded','same','reduced','paused','stopped','never_started')),
  q18_started_after_support boolean,
  q22_volume_change     text,
  q26_workers_total     int check (q26_workers_total is null or q26_workers_total >= 0),
  q26_workers_women     int check (q26_workers_women is null or q26_workers_women >= 0),
  q26_workers_under30   int check (q26_workers_under30 is null or q26_workers_under30 >= 0),

  -- Section C
  q29_selling_change    text,
  q30_events_attended   int check (q30_events_attended is null or q30_events_attended >= 0),
  q30_is_overridden     boolean not null default false,
  q31_last_event_sales_band text,
  q34_connection_made   text check (q34_connection_made in ('yes','no','connection_no_sale')),

  -- Section D, twelve-month only, feeds IMP-0
  q37_still_engaged     text check (q37_still_engaged in ('main','secondary','no')),
  q38_capacity          text,
  q40_income_change     text,

  q43_enumerator_notes  text,
  client_uuid           uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,

  unique (person_id, round),
  constraint workers_women_lte_total check (
    q26_workers_women is null or q26_workers_total is null
    or q26_workers_women <= q26_workers_total),
  constraint workers_under30_lte_total check (
    q26_workers_under30 is null or q26_workers_total is null
    or q26_workers_under30 <= q26_workers_total),
  constraint section_d_only_at_12m check (
    round = 'twelve_month'
    or (q37_still_engaged is null and q38_capacity is null and q40_income_change is null)
  )
);
select public.attach_updated_at('followup_survey');
create index followup_survey_person_idx on public.followup_survey (person_id);
create index followup_survey_round_idx  on public.followup_survey (round);
create index followup_survey_date_idx   on public.followup_survey (contact_date);

-- the long tail of questions that no indicator reads
create table public.followup_answer (
  survey_id     uuid not null references public.followup_survey(id) on delete cascade,
  question_code text not null,
  value_text    text,
  value_number  numeric,
  value_boolean boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (survey_id, question_code)
);
select public.attach_updated_at('followup_answer');

create table public.followup_answer_option (
  survey_id     uuid not null references public.followup_survey(id) on delete cascade,
  question_code text not null,
  option_id     uuid not null,
  option_other  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (survey_id, question_code, option_id)
);
select public.attach_updated_at('followup_answer_option');

-- Q23, the food-safety checklist
create table public.followup_safety_item (
  survey_id uuid not null references public.followup_survey(id) on delete cascade,
  item_id   uuid not null references public.ref_safety_item(id),
  status    tri_status_t not null,
  obstacle  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (survey_id, item_id)
);
select public.attach_updated_at('followup_safety_item');

-- Q35, the repeatable buyer block, capped at three
create table public.followup_buyer_connection (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references public.followup_survey(id) on delete cascade,
  seq           smallint not null check (seq between 1 and 3),
  buyer_name    text not null,
  buyer_type_id uuid not null references public.ref_buyer_type(id),
  how_connected text not null check (how_connected in
                  ('exhibition','referral','partner','own_effort','other')),
  arrangement   text not null check (arrangement in
                  ('one_off','repeat_no_agreement','verbal','written')),
  still_active  text not null check (still_active in ('yes','no','seasonal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id, seq)
);
select public.attach_updated_at('followup_buyer_connection');

-- Pre-fill rather than re-ask: everything the enumerator should not have to type again.
create or replace function public.followup_prefill(p_national_id text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'person', (
      select to_jsonb(pe)
      from public.person pe
      where pe.national_id = p_national_id and pe.deleted_at is null
    ),
    'trainings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'session_id',   ts.id,
               'title',        ts.title,
               'topic_en',     rt.label_en,
               'topic_ar',     rt.label_ar,
               'end_date',     ts.end_date,
               'attended',     te.attended,
               'met_criteria', te.met_criteria)
             order by ts.end_date)
      from public.training_enrolment te
      join public.training_session   ts on ts.id = te.session_id
      join public.ref_training_topic rt on rt.id = ts.topic_id
      join public.person             pe on pe.id = te.person_id
      where pe.national_id = p_national_id
        and te.deleted_at is null and ts.deleted_at is null
    ), '[]'::jsonb),
    'has_linkage', exists (
      select 1
      from public.market_linkage ml
      join public.production_initiative pi on pi.id = ml.initiative_id
      join public.person pe on pe.id = pi.person_id
      where pe.national_id = p_national_id
        and ml.deleted_at is null and ml.status in ('active','ended')
    ),
    'events_attended', (
      select count(*)
      from public.exhibition_registration er
      join public.person pe on pe.id = er.person_id
      where pe.national_id = p_national_id
        and er.status = 'approved' and er.deleted_at is null
    ),
    'support_received', jsonb_build_object(
      'initiatives', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', pi.id, 'title', pi.title,
                 'status', pi.status, 'started_on', pi.started_on))
        from public.production_initiative pi
        join public.person pe on pe.id = pi.person_id
        where pe.national_id = p_national_id and pi.deleted_at is null
      ), '[]'::jsonb),
      'guidance_sessions', (
        select count(*)
        from public.guidance_record gr
        join public.person pe on pe.id = gr.person_id
        where pe.national_id = p_national_id and gr.deleted_at is null
      ),
      'office_services', (
        select count(*)
        from public.office_service os
        join public.person pe on pe.id = os.person_id
        where pe.national_id = p_national_id and os.deleted_at is null
      )
    )
  );
$$;

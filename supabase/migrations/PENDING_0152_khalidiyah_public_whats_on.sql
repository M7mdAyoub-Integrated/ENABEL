-- 0152 · Khalidiyah's public page: what's on
--
-- Khalidiyah has no public forms (KHALIDIYAH_IMPLEMENTATION_PLAN.md §0.2).
-- Its page at /khalidiyah shows what is on: the published community
-- activities (SO2-D1) and market days (SO4-H1) that have not yet happened.
-- No apply button, no counts, no names, no partners, no participants.
--
-- One new anon-readable view, and the sixth. Every public-view lesson from
-- 0120 applies: security definer over BASE TABLES only (a definer view over an
-- invoker view shields nothing -- anon gets 42501), the four filters in the
-- view itself (published, not deleted, the municipality active, today or
-- later), the anon grant on this view alone, and the test run AS anon --
-- reading the definition proves nothing.
--
-- `is_published` (0145) is false on every row until a coordinator publishes
-- the record from its screen; the form has no field for it because the
-- sheet has none.

create view public.v_public_khld_whats_on
with (security_invoker = false) as
select a.id,
       'activity'::text            as kind,
       a.event_title               as title,
       a.event_date                as on_date,
       a.event_time_from           as time_from,
       a.event_time_to             as time_to,
       l.label_en                  as place_en,
       l.label_ar                  as place_ar,
       t.label_en                  as type_en,
       t.label_ar                  as type_ar,
       a.content_summary           as description,
       m.slug                      as municipality_slug
  from public.khld_activity a
  join public.municipality m on m.id = a.municipality_id and m.is_active and m.deleted_at is null
  left join public.ref_khld_d1_location l on l.id = a.location_id
  left join public.ref_khld_d1_activity_type t on t.id = a.activity_type_id
 where a.is_published and a.deleted_at is null and a.event_date >= current_date
union all
select k.id,
       'market'::text,
       k.market_name,
       k.market_date,
       k.times_from,
       k.times_to,
       l.label_en,
       l.label_ar,
       o.label_en,
       o.label_ar,
       null::text,
       m.slug
  from public.khld_market k
  join public.municipality m on m.id = k.municipality_id and m.is_active and m.deleted_at is null
  left join public.ref_khld_h1_location l on l.id = k.location_id
  left join public.ref_khld_h1_occasion o on o.id = k.occasion_id
 where k.is_published and k.deleted_at is null and k.market_date >= current_date;

grant select on public.v_public_khld_whats_on to anon;

comment on view public.v_public_khld_whats_on is
  'The Khalidiyah public page: published, upcoming community activities '
  '(khld_activity) and market days (khld_market) -- title, kind, date, times, '
  'place and description. No counts, no names, no partners, no participants. '
  'Security definer over base tables, filtered in the view. Sixth anon view '
  '(0152).';

-- ── verification: the anon surface grew by exactly one view, and anon can read it ──
--
-- The probe rows are inserted as the owner, read as anon, deleted as the
-- Khalidiyah admin (guard_soft_delete refuses the owner), and the whole
-- probe is rolled back by the P0152 it ends with.
do $verify$
declare
  v_khld   uuid := '00000000-0000-4000-8000-0000000000b2';
  v_act    uuid;
  v_hidden uuid;
begin
  -- 1. the anon surface is six views and four RPCs, no more
  if (select count(*) from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public') <> 6
     or exists (select 1 from information_schema.role_table_grants
                 where grantee = 'anon' and table_schema = 'public'
                   and (privilege_type <> 'SELECT' or table_name not in
                        ('v_public_opportunity','v_public_activity_type','v_public_producer_type',
                         'v_public_product','v_public_municipality','v_public_khld_whats_on'))) then
    raise exception '0152: anon table grants are not the six public views';
  end if;
  if (select count(distinct routine_name) from information_schema.role_routine_grants
       where grantee = 'anon' and specific_schema = 'public') <> 4 then
    raise exception '0152: anon routine grants changed';
  end if;
  if coalesce((select c.reloptions::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'v_public_khld_whats_on'), '') like '%security_invoker=true%' then
    raise exception '0152: the view is security invoker; anon would get 42501';
  end if;

  begin
    -- 2. a published future activity is listed; an unpublished one, a past
    --    one and a deleted one are not
    insert into public.khld_activity (municipality_id, event_title, event_date, location_id, activity_type_id, calendar_status_id,
                                      frequency_type_id, organiser_id, partner_count, content_summary, participants_planned,
                                      participants_actual, cash_cost_jod, feedback_collected_id, lessons, is_published)
    select v_khld, '0152 probe open day', current_date + 30, (select id from public.ref_khld_d1_location order by sort_order limit 1),
           (select id from public.ref_khld_d1_activity_type order by sort_order limit 1),
           (select id from public.ref_khld_d1_calendar_status order by sort_order limit 1),
           (select id from public.ref_khld_d1_frequency_type order by sort_order limit 1),
           (select id from public.ref_khld_d1_organiser order by sort_order limit 1),
           0, '0152 probe summary', 10, 0, 0,
           (select id from public.ref_khld_d1_feedback_collected order by sort_order limit 1), '-', true
    returning id into v_act;
    insert into public.khld_activity (municipality_id, event_title, event_date, location_id, activity_type_id, calendar_status_id,
                                      frequency_type_id, organiser_id, partner_count, content_summary, participants_planned,
                                      participants_actual, cash_cost_jod, feedback_collected_id, lessons, is_published)
    select v_khld, '0152 probe unpublished', current_date + 30, location_id, activity_type_id, calendar_status_id,
           frequency_type_id, organiser_id, 0, 'x', 10, 0, 0, feedback_collected_id, '-', false
      from public.khld_activity where id = v_act
    returning id into v_hidden;

    set local role anon;
    if (select count(*) from public.v_public_khld_whats_on where id = v_act and kind = 'activity'
          and title = '0152 probe open day' and description = '0152 probe summary' and municipality_slug = 'khalidiyah') <> 1 then
      raise exception '0152: anon cannot see a published future activity';
    end if;
    if exists (select 1 from public.v_public_khld_whats_on where id = v_hidden) then
      raise exception '0152: anon sees an unpublished activity';
    end if;
    -- and no route to the base table
    begin
      perform 1 from public.khld_activity limit 1;
      raise exception '0152: anon can read khld_activity directly';
    exception when insufficient_privilege then null;
    end;
    reset role;

    update public.khld_activity set event_date = current_date - 1 where id = v_act;
    set local role anon;
    if exists (select 1 from public.v_public_khld_whats_on where id = v_act) then
      raise exception '0152: anon sees a past activity';
    end if;
    reset role;

    update public.khld_activity set event_date = current_date + 30 where id = v_act;
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@khalidiyah.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.khld_activity set deleted_at = now() where id = v_act;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    if (select deleted_at from public.khld_activity where id = v_act) is null then
      raise exception '0152: the admin could not soft-delete the probe';
    end if;
    set local role anon;
    if exists (select 1 from public.v_public_khld_whats_on where id = v_act) then
      raise exception '0152: anon sees a deleted activity';
    end if;
    reset role;

    raise exception using errcode = 'P0152';
  exception
    when sqlstate 'P0152' then
      reset role;
      null;
  end;

  if exists (select 1 from public.khld_activity where event_title like '0152 probe%') then
    raise exception '0152: probe rows survived the rollback';
  end if;
  raise notice '0152: v_public_khld_whats_on answers anon; published+future listed, unpublished/past/deleted not; anon grants 6 views, 4 RPCs';
end $verify$;

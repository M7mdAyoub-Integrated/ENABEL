-- ═══════════════════════════════════════════════════════════════════════════
--  0164 — the option lists of the public volunteer form (FORM-12)
--
--  khld_register_volunteer (0161) is the one write anon may make, and its
--  row carries nine list answers: the ID type (F144), sex (F056),
--  nationality (F061), disability (F062), situation (F063), interests
--  (F064), days (F065), times (F066) and affiliation (F145). The ref_khld_*
--  tables are readable by `authenticated` only (0156), so the page could not
--  offer a single option.
--
--  ── ONE VIEW, LABELS ONLY ──
--
--  0056's reasoning: a grant on the tables would publish created_by,
--  created_at and deleted_at, and every later column. The view publishes
--  what a form needs and nothing else -- the id the answer carries, the
--  code (the page checks a national ID is nine digits and knows which
--  option asks "please specify"), both labels and the order. The nine lists
--  are named here, so a tenth is a decision and never an accident.
--
--  Retired options are filtered, not published (0056). The lists are
--  Khalidiyah's alone (ref_khld_*), so there is no municipality to scope.
--  A definer view, because anon holds no grant on the tables it reads.
-- ═══════════════════════════════════════════════════════════════════════════

create view public.v_public_khld_volunteer_option
with (security_invoker = false) as
select 'id_type'::text as list, id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_id_type where is_active and deleted_at is null
union all
select 'sex', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_sex where is_active and deleted_at is null
union all
select 'nationality', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_nationality where is_active and deleted_at is null
union all
select 'disability', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_disability where is_active and deleted_at is null
union all
select 'situation', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_situation where is_active and deleted_at is null
union all
select 'volunteer_interest', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_volunteer_interest where is_active and deleted_at is null
union all
select 'weekday', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_weekday where is_active and deleted_at is null
union all
select 'time_of_day', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_time_of_day where is_active and deleted_at is null
union all
select 'affiliation', id, code, label_en, label_ar, sort_order, allows_free_text
  from public.ref_khld_affiliation where is_active and deleted_at is null;

comment on view public.v_public_khld_volunteer_option is
  'The nine option lists of the public volunteer form (FORM-12, khld_register_volunteer): '
  'id, code, labels, order and whether the option takes free text. Label-only, the reasoning '
  'of v_public_product (0056). 0164.';

revoke all on public.v_public_khld_volunteer_option from public;
grant select on public.v_public_khld_volunteer_option to anon, authenticated;

-- ── verification: as anon ────────────────────────────────────────────────
do $verify$
declare
  v_lists int;
begin
  set local role anon;
  select count(distinct list) into v_lists from public.v_public_khld_volunteer_option;
  reset role;
  if v_lists <> 9 then
    raise exception '0164: anon sees % of the nine lists', v_lists;
  end if;
  if not exists (select 1 from public.v_public_khld_volunteer_option where list = 'id_type' and code = 'national_id') then
    raise exception '0164: the ID type list has no national_id';
  end if;
end $verify$;

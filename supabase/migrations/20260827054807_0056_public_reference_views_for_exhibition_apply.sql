-- ═══════════════════════════════════════════════════════════════════════════
--  0056 — the two reference lists the exhibition application needs
--
--  `exhibition_registration.producer_type_id` is NOT NULL, and
--  `exhibition_registration_product` is a junction to `ref_product` -- the form
--  asks what the producer makes. Neither list was reachable by anon, so the
--  exhibition branch of the public form could not be submitted.
--
--  ── VIEWS, NOT GRANTS ON THE TABLES ──
--
--  Same reasoning as joining the topic label into v_public_opportunity rather
--  than granting ref_training_topic. A grant on the table would publish
--  `sort_order`, `is_active`, `created_by`, `created_at` and `deleted_at` --
--  none of which a farmer needs, all of which then have to be considered every
--  time those tables change. The view publishes an id and two labels and
--  nothing else can leak through it.
--
--  ── BOTH IN ONE MIGRATION, DELIBERATELY ──
--
--  These arrive together because one form needs both. Asking for one grant, and
--  then another next week, is how a public surface grows without anyone ever
--  deciding it should.
--
--  ── WHAT anon MAY READ AFTER THIS ──
--
--    v_public_opportunity      what is open
--    v_public_producer_type    the "what kind of producer are you" list
--    v_public_product          the "what do you make" list
--
--  Three objects, all views, all label-only. Plus two RPCs. Nothing else.
--
--  is_active is filtered, not published: a retired category must disappear from
--  the form while the rows that already reference it keep working. That is why
--  ref_* rows are retired rather than deleted.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_public_producer_type as
select id, label_en, label_ar
  from public.ref_producer_type
 where is_active
   and deleted_at is null;

comment on view public.v_public_producer_type is
  'Producer types for the public exhibition application. Label-only by design: '
  'granting ref_producer_type itself would publish sort_order, is_active, '
  'created_by and deleted_at. Filters is_active so a retired option leaves the '
  'form while existing rows that reference it keep working.';

create or replace view public.v_public_product as
select id, label_en, label_ar
  from public.ref_product
 where is_active
   and deleted_at is null;

comment on view public.v_public_product is
  'Products for the public exhibition application, feeding '
  'exhibition_registration_product. Label-only, same reasoning as '
  'v_public_producer_type.';

revoke all on public.v_public_producer_type from public;
revoke all on public.v_public_product       from public;
grant select on public.v_public_producer_type to anon, authenticated;
grant select on public.v_public_product       to anon, authenticated;

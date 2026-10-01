-- ═══════════════════════════════════════════════════════════════════════════
--  0181 — Ramtha's public page: the activities a coordinator publishes
--
--  The owner asked on 1 October 2026 that an activity, once created in the
--  Activity Register (FORM-03), can be published on the Municipality's public
--  page or not, by a button. rmth_activity.is_published (0177) is that
--  button's column; this is what the public reads (OQ-81).
--
--  The owner also chose that the public sees the sheet's own fields and
--  nothing added: FORM-03 has no name, no place and no description, so an
--  activity reads as its category (AC-02), its type -- the networking event
--  type (AC-03) or the type of training (AC-10) -- its sector (AC-06), and
--  its dates (AC-04, AC-05). Nothing about participants, projects, hours or
--  partners arrives here, because the view does not carry it.
--
--  The shape is v_public_khld_whats_on's (0163, 0167), so the same page and
--  card render it, with three columns more: title_ar (a Ramtha title is a
--  list label, in both languages) and sector_en / sector_ar. Security
--  definer over the base tables, and its WHERE is the entire boundary:
--  published, not deleted, the municipality active, not yet ended. A
--  business incubator has no end date (AC-05 is not asked) and stays listed
--  while it is published; anything else leaves the page the day after it
--  ends. Nothing on it is applied for: Ramtha's participants are recorded by
--  staff (FORM-04).
-- ═══════════════════════════════════════════════════════════════════════════

create view public.v_public_rmth_whats_on
with (security_invoker = false) as
select a.id,
       'activity'::text as kind,
       c.label_en as title,
       c.label_ar as title_ar,
       a.start_date as on_date,
       null::text as time_from,
       null::text as time_to,
       null::text as place_en,
       null::text as place_ar,
       coalesce(nt.label_en, tt.label_en) as type_en,
       coalesce(nt.label_ar, tt.label_ar) as type_ar,
       null::text as description,
       m.slug as municipality_slug,
       coalesce(a.end_date, a.start_date) as end_date,
       null::date as apply_until,
       case when s.allows_free_text and a.sector_other is not null then s.label_en || ': ' || a.sector_other else s.label_en end as sector_en,
       case when s.allows_free_text and a.sector_other is not null then s.label_ar || ': ' || a.sector_other else s.label_ar end as sector_ar
  from public.rmth_activity a
  join public.municipality m on m.id = a.municipality_id and m.is_active and m.deleted_at is null
  join public.ref_rmth_activity_category c on c.id = a.category_id
  left join public.ref_rmth_networking_type nt on nt.id = a.networking_type_id
  left join public.ref_rmth_training_type tt on tt.id = a.training_type_id
  left join public.ref_rmth_sector s on s.id = a.sector_id
 where a.is_published
   and a.deleted_at is null
   and (c.code = 'business_incubator' or coalesce(a.end_date, a.start_date) >= public.rmth_today());

revoke all on public.v_public_rmth_whats_on from public, anon, authenticated;
grant select on public.v_public_rmth_whats_on to anon, authenticated;
comment on view public.v_public_rmth_whats_on is
  'Ramtha''s published activities (FORM-03) for the public page: category, type, sector and dates only; '
  'published, live, not ended. The shape of v_public_khld_whats_on plus title_ar, sector_en, sector_ar. 0181.';

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
begin
  if has_table_privilege('anon', 'public.v_public_rmth_whats_on', 'insert')
     or has_table_privilege('anon', 'public.v_public_rmth_whats_on', 'update')
     or has_table_privilege('authenticated', 'public.v_public_rmth_whats_on', 'delete') then
    raise exception '0181: a client role can write through the public view';
  end if;
  set local role anon;
  perform 1 from public.v_public_rmth_whats_on;
  reset role;
end $verify$;

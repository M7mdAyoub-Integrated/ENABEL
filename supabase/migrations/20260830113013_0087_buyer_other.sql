-- ═══════════════════════════════════════════════════════════════════════════
--  0087 — the buyer block has the same "Other" hole 0082 closed elsewhere
--
--  ── WHERE 0082 DID NOT REACH ──
--
--  0082 made followup_answer_option refuse an "Other" with nothing specified.
--  It fixed the table where the survey's option lists live, and
--  followup_buyer_connection is not that table -- Q35 repeats up to three
--  times, so its answers are columns on their own rows.
--
--  Two of those columns take an "Other" and neither has anywhere to put it:
--
--      buyer_type_id  -> ref_buyer_type, whose `other` row has
--                        allows_free_text = true. No companion column.
--      how_connected  -> a check constraint listing 'other' as the fifth
--                        option. No companion column.
--
--  So "a buyer of some other kind, connected some other way" was storable and
--  the two things that would make it useful were not. Same defect, one table
--  further out, found by looking rather than by it going wrong.
--
--  CLAUDE.md states the convention: the ref_ row carries allows_free_text, the
--  owning table carries a matching *_other column, and a constraint requires
--  the text when that option is chosen. This is that, applied.
--
--  ── WHY CHECK CONSTRAINTS HERE AND A TRIGGER THERE ──
--
--  followup_answer_option needed a trigger because the list it points into
--  depends on question_code -- one constraint cannot see across eight tables.
--
--  Here, how_connected is already a check constraint over five literals, so its
--  rule is a check constraint too. buyer_type_id is a real foreign key to one
--  known table, so a check constraint cannot read allows_free_text and that one
--  is a trigger. Different shapes because the columns are different shapes, not
--  because two approaches were wanted.
--
--  ── NO BACKFILL ──
--
--  followup_buyer_connection has no rows. Section C has not been built yet, so
--  nothing exists to be made invalid by adding these constraints. Confirmed
--  before writing, not assumed.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.followup_buyer_connection
  add column buyer_type_other  text,
  add column how_connected_other text;

comment on column public.followup_buyer_connection.buyer_type_other is
  'Q35. What kind of buyer, when ref_buyer_type says "Other". Required by '
  'guard_buyer_connection_other when that option is chosen, refused otherwise.';
comment on column public.followup_buyer_connection.how_connected_other is
  'Q35. How the connection came about, when how_connected is ''other''. The '
  'other four values attribute the connection to municipal support or to the '
  'producer''s own effort, which is what the question is for -- so "other" '
  'without a description answers nothing.';

-- how_connected is a fixed list, so its rule is a constraint.
alter table public.followup_buyer_connection
  add constraint buyer_how_connected_other_needed check (
    (how_connected = 'other') = (nullif(btrim(how_connected_other), '') is not null)
  );

-- buyer_type_id is a foreign key, and whether its target allows free text lives
-- in a column of ref_buyer_type. A check constraint cannot read another table.
create or replace function public.guard_buyer_connection_other()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_free boolean;
begin
  select allows_free_text into v_free
    from ref_buyer_type where id = new.buyer_type_id and deleted_at is null;

  -- allows_free_text is `not null default false`, so a null here means no row
  -- matched. The foreign key already refuses that, but a soft-deleted buyer
  -- type would pass the key and arrive here.
  if v_free is null then
    raise exception 'buyer type % is not a live row in ref_buyer_type', new.buyer_type_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_free and coalesce(btrim(new.buyer_type_other), '') = '' then
    raise exception 'this buyer type allows free text, so buyer_type_other must say what it was'
      using errcode = 'check_violation';
  end if;

  if not v_free and new.buyer_type_other is not null then
    raise exception 'this buyer type is a fixed answer and takes no free text'
      using errcode = 'check_violation';
  end if;

  return new;
end $function$;

comment on function public.guard_buyer_connection_other() is
  'Requires buyer_type_other when ref_buyer_type says the chosen option allows '
  'free text, and refuses it otherwise. The companion of '
  'buyer_how_connected_other_needed; a check constraint cannot do this one '
  'because allows_free_text lives in another table.';

revoke all on function public.guard_buyer_connection_other() from public, anon, authenticated;

create trigger trg_buyer_connection_other_guard
  before insert or update on public.followup_buyer_connection
  for each row execute function public.guard_buyer_connection_other();

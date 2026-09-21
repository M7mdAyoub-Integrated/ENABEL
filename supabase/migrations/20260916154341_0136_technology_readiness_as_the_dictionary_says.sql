-- 0136 · The partner role reads "Technology readiness", as the dictionary says
--
-- ── WHY ──
--
--  04_DATA_DICTIONARY.md section 3 lists the production-support partner roles
--  and, against the ninth, says: "Tech readyness  <- typo in source; seed as
--  'Technology readiness'". Its section 12 table of workbook typos repeats
--  the correction. 0016 seeded the row as 'Tech readiness' -- neither the
--  workbook's spelling nor the dictionary's -- and every partner form since
--  has offered a label the source never specified.
--
--  Found on 16 September 2026 by reading the /forms/pn option list against
--  the dictionary line by line, as the form audit required. It is the only
--  Sahel Horan option-list label that disagrees with the dictionary.
--
-- ── WHAT CHANGES ──
--
--  One label. `label_ar` is null on all ten rows of this list (OQ-32) and
--  stays so; `code`, `sort_order` and `allows_free_text` are untouched, so
--  nothing that references the row moves.
--
--  Data, not DDL, and written as a migration anyway: a ref_ label is part of
--  what the form shows the coordinator, and the seed that set it wrong is a
--  migration. A later `supabase db reset` replays 0016 and then this.

update public.ref_partner_role_production
   set label_en = 'Technology readiness'
 where code = 'tech_readiness'
   and label_en = 'Tech readiness';

do $$
declare
  v_label text;
begin
  select label_en into v_label
    from public.ref_partner_role_production
   where code = 'tech_readiness' and deleted_at is null;
  if v_label is distinct from 'Technology readiness' then
    raise exception '0136: tech_readiness reads %, expected Technology readiness', v_label;
  end if;
end $$;

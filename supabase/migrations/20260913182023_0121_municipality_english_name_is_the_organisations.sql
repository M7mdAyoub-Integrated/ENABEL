-- ═══════════════════════════════════════════════════════════════════════════
--  0121 — the municipality's English name is the organisation's
--
--  0111 seeded `name_en` as the PLACE ("Sahel Horan", "Ramtha") and `name_ar`
--  as the ORGANISATION ("بلدية سهل حوران", "بلدية الرمثا" — Municipality of
--  ...). The two columns disagreed about what a name is, and it showed the
--  moment the row replaced the locale strings: the staff header (Part 2) and
--  now the public masthead (0120) read "Sahel Horan" in English where
--  `common:orgName` and `public:siteName` had always read "Sahel Horan
--  Municipality", while Arabic kept saying بلدية. CLAUDE.md's first line is
--  "Sahel Horan Municipality, Jordan": that is the name.
--
--  Two rows, one column, a data change. Every screen that shows the name
--  reads it from here, which is the point of having moved it here.
-- ═══════════════════════════════════════════════════════════════════════════

update public.municipality
   set name_en = 'Sahel Horan Municipality'
 where code = 'SHM' and name_en = 'Sahel Horan';

update public.municipality
   set name_en = 'Ramtha Municipality'
 where code = 'RMTH' and name_en = 'Ramtha';

do $verify$
begin
  if (select name_en from public.municipality where code = 'SHM') <> 'Sahel Horan Municipality'
     or (select name_en from public.municipality where code = 'RMTH') <> 'Ramtha Municipality' then
    raise exception '0121: the two names were not what this migration expected to find';
  end if;
  -- and the public view, which the masthead reads, says the same
  if (select name_en from public.v_public_municipality where code = 'SHM') <> 'Sahel Horan Municipality' then
    raise exception '0121: v_public_municipality does not reflect the change';
  end if;
end $verify$;

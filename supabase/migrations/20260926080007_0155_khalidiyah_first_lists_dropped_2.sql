-- ═══════════════════════════════════════════════════════════════════════════
--  0155 — Khalidiyah's first option lists dropped, second half
--
--  The 238 ref_khld_* lists of 0141-0143 and 0145 served only the tables
--  0153 dropped. They are dropped in two migrations of 119, in name order,
--  because one transaction dropping them with the tables ran out of lock
--  slots (0153's header). Each drop names no cascade: a list something
--  else still reads stops the migration.
--
--  After this file no ref_khld_* table exists; 0156 creates the new ones.
-- ═══════════════════════════════════════════════════════════════════════════

do $lists$
declare t text; n int := 0;
begin
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
            where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'ref\_khld\_%'
            order by c.relname
            limit 119
  loop
    execute format('drop table public.%I', t);
    n := n + 1;
  end loop;
  if n <> 119 then
    raise exception '0155: dropped % option lists, expected 119', n;
  end if;
  -- nothing of 0141-0143 is left
  if exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
              where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'ref\_khld\_%') then
    raise exception '0155: an old option list remains';
  end if;
end $lists$;

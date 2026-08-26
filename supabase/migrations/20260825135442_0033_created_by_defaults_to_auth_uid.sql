-- ═══════════════════════════════════════════════════════════════════════════
--  0033 — created_by defaults to auth.uid()
--
--  Found while wiring the first real form in Phase 4: a partnership created
--  through the app landed with created_by NULL. The column is on all 36 tables
--  that carry the standard block, and not one of them had a default, so every
--  insert from every module would have lost its author.
--
--  Why a DEFAULT rather than sending the id from the client:
--
--   • It cannot be forgotten. Seven modules times insert-and-upsert paths is a
--     lot of places to remember one column; a default is remembered once.
--   • It cannot be forged. A client-supplied created_by is just a value in a
--     request body — any authenticated user could write someone else's id into
--     it. auth.uid() is read from the verified JWT by the server.
--   • It stays correct for rows written by a trigger or a future RPC, which
--     never pass through the client at all.
--
--  A default only applies when the column is OMITTED, so nothing that already
--  sets it explicitly changes behaviour, and no existing row is touched.
--
--  Existing NULLs are deliberately LEFT AS THEY ARE. Backfilling them with a
--  current user id would attribute demo and migration rows to whoever happened
--  to run this, which is worse than an honest NULL in an audit column.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'created_by'
      and c.column_default is null
      and t.table_type = 'BASE TABLE'
      -- audit_log is written by the audit trigger, which records the actor in
      -- its own column. Leave its shape alone: 0013 made it insert-only and
      -- unmodifiable by anyone, including a coordinator.
      and c.table_name <> 'audit_log'
  loop
    execute format(
      'alter table public.%I alter column created_by set default auth.uid()',
      r.table_name
    );
  end loop;
end $$;

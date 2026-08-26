-- 0015b storage policies + audit trigger for tables created after the 0013 sweep
create policy evidence_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.is_staff());

create policy evidence_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_staff());

create policy evidence_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'evidence' and public.is_staff())
  with check (bucket_id = 'evidence' and public.is_staff());

-- attachment was created after the audit sweep ran, so it has no trigger yet
do $outer$
declare r record;
begin
  for r in
    select c.relname as t
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind = 'r'
      and c.relname <> 'audit_log'
      and not exists (
        select 1 from pg_trigger g
        where g.tgrelid = c.oid and g.tgname = 'trg_' || c.relname || '_audit'
      )
  loop
    execute format(
      'create trigger trg_%s_audit after insert or update or delete on public.%I '
      'for each row execute function public.audit_row()', r.t, r.t);
  end loop;
end $outer$;

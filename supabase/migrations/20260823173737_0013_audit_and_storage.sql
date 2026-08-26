-- 0013 audit_and_storage
create table public.audit_log (
  id         bigserial primary key,
  table_name text not null,
  row_id     uuid,               -- null for composite-key tables; identity lives in the jsonb
  action     text not null check (action in ('insert','update','delete','restore')),
  actor      uuid,
  actor_role app_role_t,
  changed_at timestamptz not null default now(),
  old_data   jsonb,
  new_data   jsonb,
  changed_fields text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.attach_updated_at('audit_log');
create index audit_log_lookup_idx on public.audit_log (table_name, row_id, changed_at desc);
create index audit_log_actor_idx  on public.audit_log (actor, changed_at desc);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_action text; v_row_id uuid; v_changed text[];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    -- a soft delete is a delete, and clearing it is a restore
    if   (v_old->>'deleted_at') is null and (v_new->>'deleted_at') is not null then
      v_action := 'delete';
    elsif (v_old->>'deleted_at') is not null and (v_new->>'deleted_at') is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from (v_old -> n.key)
      and n.key not in ('updated_at');
  else
    v_old := to_jsonb(old);
    v_action := 'delete';
  end if;

  v_row_id := nullif(coalesce(v_new->>'id', v_old->>'id'), '')::uuid;

  insert into public.audit_log
    (table_name, row_id, action, actor, actor_role, old_data, new_data, changed_fields)
  values
    (tg_table_name, v_row_id, v_action, auth.uid(), public.current_role(),
     v_old, v_new, v_changed);

  return coalesce(new, old);
end $$;

-- attach to every table in public except the log itself
do $outer$
declare r record;
begin
  for r in
    select c.relname as t
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind = 'r'
      and c.relname <> 'audit_log'
  loop
    execute format('drop trigger if exists trg_%s_audit on public.%I', r.t, r.t);
    execute format(
      'create trigger trg_%s_audit after insert or update or delete on public.%I '
      'for each row execute function public.audit_row()', r.t, r.t);
  end loop;
end $outer$;

create table public.attachment (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    uuid not null,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by  uuid references auth.users(id),
  uploaded_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_updated_at('attachment');
create index attachment_entity_idx on public.attachment (entity_type, entity_id);

-- private evidence bucket
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- 0001 extensions_and_helpers
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- helper so every migration can attach the trigger in one line
create or replace function public.attach_updated_at(p_table text)
returns void language plpgsql as $$
begin
  execute format('drop trigger if exists trg_%s_updated on public.%I', p_table, p_table);
  execute format(
    'create trigger trg_%s_updated before update on public.%I '
    'for each row execute function public.set_updated_at()', p_table, p_table);
end $$;

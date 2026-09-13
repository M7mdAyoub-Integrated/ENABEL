-- ═══════════════════════════════════════════════════════════════════════════
--  0119 — two columns the account and municipality screens need
--
--  ── app_user.email ──
--
--  The accounts screen (plan §2.5) lists staff accounts. `app_user` carries a
--  name, a role and a municipality but not the address the person signs in
--  with — that lives in `auth.users`, which `authenticated` cannot read (the
--  0107 lesson). Copied here by `handle_new_user` when the account is created
--  and backfilled once from auth.users for the accounts that already exist.
--  A staff email is not personal data in the sense the platform protects
--  (national IDs, refugee status); it is the thing an admin needs to see to
--  know which row is whose.
--
--  handle_new_user versions before this one: 0003, 0117. The body below is
--  0117's with one column added.
--
--  ── municipality.programme_en / programme_ar ──
--
--  The header of every municipal screen reads `common:programmeLine`, which
--  is Sahel Horan's Action Plan title, funder and implementer — a locale
--  string, so a Ramtha admin would see Sahel Horan's programme above Ramtha's
--  data. It becomes a column on `municipality`, like the name already is.
--  Sahel Horan's values are the existing locale strings, verbatim. Ramtha's
--  is the plan's own description of the programme — "an employment and
--  entrepreneurship programme" — and nothing more: neither workbook names the
--  Ramtha plan, its funder or its implementer, so none is claimed.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.app_user add column email text;

update public.app_user a
   set email = u.email
  from auth.users u
 where u.id = a.id and a.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role app_role_t;
  v_muni uuid;
begin
  begin
    v_role := coalesce(nullif(new.raw_app_meta_data->>'app_role', ''), 'participant')::app_role_t;
  exception when invalid_text_representation then
    v_role := 'participant';
  end;
  v_muni := nullif(new.raw_app_meta_data->>'municipality_id', '')::uuid;

  insert into public.app_user (id, full_name, role, municipality_id, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Unknown'),
    v_role,
    case when v_role = 'super_admin' then null else v_muni end,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

alter table public.municipality
  add column programme_en text,
  add column programme_ar text;

update public.municipality
   set programme_en = 'Action Plan for Enhancing Local Economic Participation · Funded by the European Union · Implemented with Enabel',
       programme_ar = 'خطة عمل تعزيز المشاركة الاقتصادية المحلية · بتمويل من الاتحاد الأوروبي · بالتنفيذ مع إنابل'
 where code = 'SHM';

update public.municipality
   set programme_en = 'Employment and entrepreneurship programme',
       programme_ar = 'برنامج التشغيل وريادة الأعمال'
 where code = 'RMTH';

do $verify$
begin
  if exists (select 1 from public.app_user where email is null) then
    raise exception '0119: an app_user has no email after the backfill';
  end if;
  if exists (select 1 from public.municipality where programme_en is null) then
    raise exception '0119: a municipality has no programme line';
  end if;
end $verify$;

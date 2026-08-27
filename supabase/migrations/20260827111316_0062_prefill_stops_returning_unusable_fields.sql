-- ═══════════════════════════════════════════════════════════════════════════
--  0062 — applicant_prefill stops returning what the form cannot show
--
--  The payload carried `nationality_id` and `agri_involvement_id`. The apply
--  form fetched both and used NEITHER: they are uuids, and rendering them as
--  words would need anon grants on `ref_nationality` and
--  `ref_agri_involvement`.
--
--  That was the worst of both. Personal data crossed into an anonymous
--  browser -- where it sits in memory and in any network log -- and nobody
--  ever saw it. The exposure with none of the benefit.
--
--  ── WHY REMOVE RATHER THAN GRANT ──
--
--  Displaying them properly means two more tables readable by anon, widening
--  the public surface for two fields nobody asked to see, on a form whose whole
--  purpose is to ask as little as possible. `anon` currently reads three
--  label-only views and two RPCs; that is a boundary worth keeping small.
--
--  If the Municipality later wants nationality prefilled and visible, the way
--  to do it is a joined LABEL in this function's payload -- the same trick
--  v_public_opportunity uses for the topic -- not a grant on the ref table.
--
--  What remains is exactly what the form displays back: full_name to confirm
--  identity, and sex, village and phone shown read-only so nobody is asked a
--  question the Municipality can already answer.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function applicant_prefill(
  p_national_id    text,
  p_date_of_birth  date default null,
  p_phone          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone   text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client  text;
  v_ok      boolean;
  v_person  person%rowtype;
  c_miss    constant jsonb := jsonb_build_object('found', false);
begin
  v_client := coalesce(
    split_part(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ',', 1),
    'unknown');

  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);

  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5)
          and v_ok;

  if not v_ok then
    return c_miss;
  end if;

  select * into v_person
    from person
   where national_id = v_id
     and deleted_at is null;

  if not found then
    return c_miss;
  end if;

  -- Same asymmetric rule as 0053: no downgrade from a date of birth that
  -- exists to a phone number.
  if v_person.date_of_birth is not null then
    if p_date_of_birth is null or v_person.date_of_birth <> p_date_of_birth then
      return c_miss;
    end if;
  else
    if length(v_phone) < 9
       or right(regexp_replace(coalesce(v_person.phone, ''), '\D', '', 'g'), 9) <> v_phone then
      return c_miss;
    end if;
  end if;

  return jsonb_build_object(
    'found',     true,
    'full_name', v_person.full_name,
    'sex',       v_person.sex,
    'village',   v_person.village,
    'phone',     v_person.phone
  );
end;
$$;

revoke all on function applicant_prefill(text, date, text) from public;
grant execute on function applicant_prefill(text, date, text) to anon, authenticated;

comment on function applicant_prefill(text, date, text) is
  'Public applicant lookup. Verifies on national ID + date of birth, falling '
  'back to national ID + phone ONLY when the person has no date_of_birth on '
  'file. Never downgrades. Returns a fixed {"found": false} for every failure '
  'mode so it cannot be used as an existence oracle. Returns ONLY what the '
  'apply form displays back: full_name, sex, village, phone. Never '
  'is_refugee, has_disability, disability_type_id or person_id -- and no '
  'reference-table uuid the browser cannot render without a new anon grant.';

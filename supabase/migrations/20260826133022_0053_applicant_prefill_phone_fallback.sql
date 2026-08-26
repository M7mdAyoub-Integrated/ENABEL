-- ═══════════════════════════════════════════════════════════════════════════
--  0053 — a second way in, for people with no date of birth on file
--
--  OQ-22: applicant_prefill verifies on national ID + date of birth, but
--  person.date_of_birth is nullable. Someone with no DOB recorded could never
--  satisfy the check, would be told "not found", and would register again as a
--  new person -- inflating A1.3, B1.2, D0.1 and E0.2 permanently, because all
--  four count distinct person_id.
--
--  ── WHAT WAS REJECTED ──
--
--  Making date_of_birth NOT NULL. It blocks staff who genuinely do not know a
--  participant's birth date, and a required field that cannot be answered
--  honestly gets filled with garbage -- 01/01/1980 for everyone, which is worse
--  than null because it looks like data.
--
--  ── THE RULE ──
--
--    date_of_birth IS NOT NULL  ->  the DOB must match. Phone is not accepted.
--    date_of_birth IS NULL      ->  the phone must match.
--
--  The strong factor stays primary and cannot be DOWNGRADED: you may not offer
--  a phone number instead of a date of birth for a person who has one on file.
--  Otherwise anyone knowing a phone number could bypass the DOB check.
--
--  Someone with neither on file cannot self-serve and must visit the office.
--  That is the correct outcome, not a gap.
--
--  ── PHONE MATCHING ──
--
--  Compared on the LAST NINE DIGITS after stripping everything non-numeric, so
--  0791234567, +962791234567 and 00962 79 123 4567 are the same number. Jordan
--  mobile numbers are 07XXXXXXXX locally and +9627XXXXXXXX internationally; the
--  trailing nine digits are the shared part. Storage is untouched -- staff-typed
--  phone numbers keep whatever format they were entered in.
--
--  ── STILL ONE FAILURE VALUE ──
--
--  Every miss returns the same {"found": false} as before: wrong DOB, wrong
--  phone, right factor but wrong branch, unknown ID, soft-deleted, throttled.
--  The caller cannot learn which factor a person has on file by watching which
--  request succeeds, because a failure never says why.
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

  -- The gate. Note the asymmetry is deliberate: a person WITH a date of birth
  -- can only be verified by it. No downgrade to the weaker factor.
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
    'found',               true,
    'full_name',           v_person.full_name,
    'sex',                 v_person.sex,
    'village',             v_person.village,
    'phone',               v_person.phone,
    'nationality_id',      v_person.nationality_id,
    'agri_involvement_id', v_person.agri_involvement_id
  );
end;
$$;

revoke all on function applicant_prefill(text, date, text) from public;
grant execute on function applicant_prefill(text, date, text) to anon, authenticated;

-- The two-argument form from 0052 is dropped: leaving it in place would mean
-- two functions with the same name and different rules, and PostgREST would
-- pick by argument shape. One implementation of an auth check, not two.
-- Dropped BEFORE the comment below, because `comment on function` cannot
-- resolve an overloaded name without an argument list.
drop function if exists applicant_prefill(text, date);

comment on function applicant_prefill(text, date, text) is
  'Public applicant lookup. Verifies on national ID + date of birth, falling '
  'back to national ID + phone ONLY when the person has no date_of_birth on '
  'file. Never downgrades: a person with a DOB cannot be verified by phone. '
  'Returns a fixed {"found": false} for every failure mode so it cannot be used '
  'as an existence oracle. Never returns is_refugee, has_disability, '
  'disability_type_id or person_id.';

-- ── making the existing gap visible and closable ──────────────────────────
--
-- A person with neither a date of birth nor a phone cannot self-serve at all.
-- Staff need to see who that is, so the gap can be closed by asking, rather
-- than discovered when someone is turned away.
create or replace view public.v_person_missing_verification
with (security_invoker = true) as
select p.id,
       p.national_id,
       p.full_name,
       p.village,
       p.phone,
       p.date_of_birth,
       case
         when p.date_of_birth is null and coalesce(btrim(p.phone), '') = ''
           then 'cannot_self_serve'
         when p.date_of_birth is null
           then 'phone_only'
       end as verification_state
  from person p
 where p.deleted_at is null
   and p.date_of_birth is null;

comment on view public.v_person_missing_verification is
  'People with no date of birth on file. verification_state = phone_only means '
  'they can still use the public lookup via their phone number; '
  'cannot_self_serve means they have neither factor and must be helped at the '
  'office. security_invoker, so it names people only to roles that may read '
  'person. See 06_OPEN_QUESTIONS.md OQ-22.';

revoke all on public.v_person_missing_verification from public, anon;
grant select on public.v_person_missing_verification to authenticated;
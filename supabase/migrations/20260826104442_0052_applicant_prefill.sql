-- ─────────────────────────────────────────────────────────────────────────────
-- applicant_prefill(national_id, date_of_birth)
--
-- The only way an unauthenticated visitor can learn anything about a person.
-- Everything about it is shaped by one requirement: it must not become a way to
-- enumerate the participant registry.
--
-- ── WHAT IT DELIBERATELY DOES NOT RETURN ──
--
--   is_refugee, has_disability, disability_type_id
--       These are the reason the registry is sensitive at all. A lookup that
--       confirmed refugee status for a national ID would be a protection
--       incident, not a feature. They are never returned, at any confidence.
--
--   id (person_id)
--       Not needed. apply_for_opportunity() re-derives the person from the same
--       ID + DOB pair, so no durable handle to a person row ever reaches the
--       browser. A person_id in client hands is a thing to be replayed later.
--
--   national_id, notes, auth_user_id, created_by
--       The caller already typed the national ID; echoing it back proves
--       nothing. The rest are staff-side.
--
-- ── WHAT IT RETURNS, AND WHY EACH FIELD EARNS ITS PLACE ──
--
--   found            the caller needs to know which branch of the form to show
--   full_name        so the applicant can see it IS them before applying --
--                    this is the typo defence, see below
--   sex, village, phone, nationality_id, agri_involvement_id
--                    the form fields that would otherwise be retyped, and which
--                    the applicant already knows about themselves
--
-- ── FAILURE IS ONE VALUE, NOT SEVERAL ──
--
-- Wrong DOB, unknown national ID, soft-deleted person, a person whose DOB was
-- never recorded, and a throttled caller all return the SAME literal
-- {"found": false}. Distinguishing them is exactly the oracle an enumerator
-- wants. Note this means a rate-limited caller cannot tell they are rate
-- limited -- intentional.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function applicant_prefill(
  p_national_id    text,
  p_date_of_birth  date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_client  text;
  v_ok      boolean;
  v_person  person%rowtype;
  -- One shared failure value. Built once so no branch can drift from another.
  c_miss    constant jsonb := jsonb_build_object('found', false);
begin
  -- Caller fingerprint for the 'client' scope. Behind PostgREST this is the
  -- Supabase edge; x-forwarded-for carries the real origin. Missing header is
  -- treated as one shared bucket rather than skipping the limit, so a caller
  -- cannot opt out of throttling by stripping the header.
  v_client := coalesce(
    split_part(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ',', 1),
    'unknown');

  -- Shape is checked before anything touches the table, but a malformed ID is
  -- still charged against the budget -- otherwise probing the format is free.
  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);

  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  -- Per-identifier budget is tighter: a legitimate person needs a handful of
  -- attempts at their own record, never dozens.
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5)
          and v_ok;

  if not v_ok then
    return c_miss;
  end if;

  select * into v_person
    from person
   where national_id = v_id
     and deleted_at is null
     -- A person with no recorded DOB cannot be verified, so they are a miss.
     -- This is a real duplicate risk, handled in the UI rather than by
     -- weakening the check. See 06_OPEN_QUESTIONS.md OQ-22.
     and date_of_birth is not null
     and date_of_birth = p_date_of_birth;

  if not found then
    return c_miss;
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

revoke all on function applicant_prefill(text, date) from public;
grant execute on function applicant_prefill(text, date) to anon, authenticated;

comment on function applicant_prefill is
  'Public applicant lookup by national ID + date of birth. Returns a fixed '
  '{"found": false} for every failure mode so it cannot be used as an existence '
  'oracle. Never returns is_refugee, has_disability, disability_type_id or '
  'person_id.';

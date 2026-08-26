-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting for the public applicant lookup.
--
-- The public apply flow asks for national ID + date of birth. That pair is the
-- only thing standing between anon and the participant registry, so the lookup
-- has to be expensive to repeat. Without this, the 9-digit ID space (10^9, and
-- realistically far smaller once you know Jordanian ID structure) can be walked.
--
-- TWO SCOPES, because one alone is useless:
--   'identifier' -- attempts against ONE national ID. Stops someone grinding
--                   dates of birth against a person they have targeted.
--   'client'     -- attempts from one caller, whatever ID they ask about. Stops
--                   someone walking the ID space, which the identifier scope
--                   would never see because every attempt uses a fresh ID.
--
-- WHY THE KEY IS HASHED AND SALTED: a bare sha256 of a 9-digit number is not a
-- secret -- all 10^9 hashes can be precomputed in minutes. So this table would
-- become a plaintext list of every national ID anyone ever typed, including
-- wrong guesses. The salt lives in applicant_lookup_secret, which no role can
-- read; only the security-definer functions below can.
--
-- NOTE: bump_lookup_throttle as written here calls hmac() unqualified, which
-- fails at runtime because pgcrypto lives in `extensions`. Fixed in 0051.
-- Kept as applied -- migrations are append-only.
-- ─────────────────────────────────────────────────────────────────────────────

create table applicant_lookup_secret (
  id      boolean primary key default true constraint one_row_only check (id),
  salt    text not null,
  created_at timestamptz not null default now()
);

comment on table applicant_lookup_secret is
  'Single-row HMAC salt for applicant lookup throttling. No role may read this; '
  'only the security-definer lookup functions can. Rotating the salt resets all '
  'live throttle buckets, which is acceptable.';

insert into applicant_lookup_secret (salt)
values (encode(gen_random_bytes(32), 'hex'));

alter table applicant_lookup_secret enable row level security;
-- Deliberately NO policy. RLS with zero policies denies every role, which is
-- exactly right: the salt is readable only through security definer.

-- ── the buckets ──────────────────────────────────────────────────────────────

create table applicant_lookup_throttle (
  scope         text        not null check (scope in ('identifier', 'client')),
  key_hash      text        not null,
  minute_bucket timestamptz not null,
  attempts      integer     not null default 0 check (attempts >= 0),
  primary key (scope, key_hash, minute_bucket)
);

-- DEVIATION FROM THE STANDARD COLUMN BLOCK, stated rather than hidden.
--
-- No id/created_by/deleted_at, and rows are hard-deleted when they age out.
-- The no-hard-delete rule exists so programme data stays auditable for the
-- donor. These are ephemeral counters holding no programme data and no PII --
-- only salted hashes and a count. Keeping them forever would grow without bound
-- and would preserve a record of every lookup a member of the public ever made,
-- which is worse for privacy, not better. audit_log is already an explicit
-- exception to the deletion rule; this is a second one, recorded in
-- 06_OPEN_QUESTIONS.md for the coordinator to confirm.
comment on table applicant_lookup_throttle is
  'Ephemeral rate-limit counters for the public applicant lookup. Not programme '
  'data: no id, no deleted_at, purged on write. See 06_OPEN_QUESTIONS.md OQ-21.';

create index applicant_lookup_throttle_bucket_idx
  on applicant_lookup_throttle (minute_bucket);

alter table applicant_lookup_throttle enable row level security;
-- Again no policy: counters are touched only by security-definer functions.
-- anon must never be able to read its own remaining budget, nor clear it.

-- ── the counter ──────────────────────────────────────────────────────────────

create or replace function bump_lookup_throttle(
  p_scope   text,
  p_value   text,
  p_window  interval,
  p_limit   integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash  text;
  v_now   timestamptz := now();
  v_used  integer;
begin
  -- Salted so the stored key cannot be reversed to a national ID.
  select encode(hmac(p_value, s.salt, 'sha256'), 'hex')
    into v_hash
    from applicant_lookup_secret s
   where s.id;

  -- Purge on write rather than on a schedule -- there is no cron here, and an
  -- unbounded table is a slow outage. Cheap: it is an index scan on a table
  -- that never holds more than a few minutes of traffic.
  delete from applicant_lookup_throttle
   where minute_bucket < v_now - (p_window + interval '5 minutes');

  insert into applicant_lookup_throttle (scope, key_hash, minute_bucket, attempts)
  values (p_scope, v_hash, date_trunc('minute', v_now), 1)
  on conflict (scope, key_hash, minute_bucket)
    do update set attempts = applicant_lookup_throttle.attempts + 1;

  select coalesce(sum(attempts), 0)
    into v_used
    from applicant_lookup_throttle
   where scope = p_scope
     and key_hash = v_hash
     and minute_bucket > v_now - p_window;

  -- true = still within budget.
  return v_used <= p_limit;
end;
$$;

revoke all on function bump_lookup_throttle(text, text, interval, integer) from public, anon, authenticated;

comment on function bump_lookup_throttle is
  'Increments and tests a rate-limit bucket. Counts the attempt BEFORE testing, '
  'so a refused attempt still costs budget -- otherwise the limit is free to '
  'probe. Callable only by the lookup functions, never directly.';

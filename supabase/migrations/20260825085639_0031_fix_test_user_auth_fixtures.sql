-- ═══════════════════════════════════════════════════════════════════════════
--  0031 — repair the BUILD-PHASE test-user fixtures created in 0030
--
--  ⚠ BUILD-PHASE ONLY. These six accounts and their identities must be gone
--    before go-live. The go-live audit-boundary step in 07_BUILD_CHECKLIST.md
--    owns their removal; deleting the auth.users rows removes the identity
--    rows with them, because auth.identities.user_id cascades.
--
--  Migration 0030 inserted rows into auth.users directly. That is only safe if
--  you match what GoTrue expects, and it did not, in two ways.
--
--  A. The token columns were left NULL.
--     GoTrue scans confirmation_token, recovery_token, email_change and
--     email_change_token_new into a Go `string`, which cannot hold NULL. Every
--     sign-in attempt therefore failed before it reached the password check,
--     and surfaced to the browser as the generic "Database error querying
--     schema". The column default is '' for exactly this reason; 0030 wrote an
--     explicit NULL over it. Empty string means "no token outstanding".
--
--  B. There were no auth.identities rows.
--     An email/password user is still a user with an `email` provider identity.
--     Without it the account has no linked provider, which breaks identity
--     lookups and account linking, and leaves the fixtures unlike anything the
--     Coordinator will create through the real invite flow. If the test users
--     are not shaped like production users, testing them proves nothing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── A. NULL tokens → empty string ─────────────────────────────────────────
update auth.users
set confirmation_token          = coalesce(confirmation_token, ''),
    recovery_token              = coalesce(recovery_token, ''),
    email_change                = coalesce(email_change, ''),
    email_change_token_new      = coalesce(email_change_token_new, ''),
    email_change_token_current  = coalesce(email_change_token_current, ''),
    phone_change                = coalesce(phone_change, ''),
    phone_change_token          = coalesce(phone_change_token, ''),
    reauthentication_token      = coalesce(reauthentication_token, '')
where email like '%@shm.test';

-- ── B. the missing email identities ───────────────────────────────────────
-- provider_id is the subject for this provider. For the email provider that is
-- the user id, which is also what the Supabase invite flow writes.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(),
       u.id,
       u.id::text,
       jsonb_build_object(
         'sub',            u.id::text,
         'email',          u.email,
         'email_verified', true,
         'phone_verified', false
       ),
       'email',
       null,
       now(),
       now()
from auth.users u
where u.email like '%@shm.test'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

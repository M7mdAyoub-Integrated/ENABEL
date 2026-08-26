#!/usr/bin/env bash
#
# Verify that every migration FILE matches the SQL that was actually APPLIED.
#
# ── WHY THIS EXISTS ──
#
# Migrations 0034-0049 were applied through the Supabase MCP, and the local file
# was left as a three-line note saying "see the remote for the authoritative
# text". Sixteen consecutive migrations had no SQL in the repository. The
# database could not be rebuilt from source, and the GitHub backup did not
# contain the schema it was supposed to be backing up.
#
# The SQL was recovered verbatim from supabase_migrations.schema_migrations,
# which stores the exact text of each applied migration. This script is what
# stops it happening again.
#
# ── HOW TO RUN IT ──
#
#   1. Run this query against the linked project (Supabase MCP, or the SQL
#      editor) and save the single output cell to supabase/.ledger_manifest:
#
#        select string_agg(
#                 version || '_' || name || ' ' ||
#                 md5(array_to_string(statements, E';\n')),
#                 E'\n' order by version)
#        from supabase_migrations.schema_migrations;
#
#   2. bash supabase/check_migration_files.sh
#
# Exit code 0 means the repository can rebuild the database. Anything else means
# it cannot, and the difference is printed.
#
# Note on hashing: the ledger is NOT consistent about a trailing newline.
# Migrations applied early (0001-0029) have one in their stored text; those
# applied later through the MCP do not. Files on disk should always end with a
# newline. So each file is hashed both as-is and with the final newline
# stripped, and either matching counts as exact. A trailing newline is not a
# difference worth failing a build over; a changed statement is.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="${1:-$here/.ledger_manifest}"
migdir="$here/migrations"

if [[ ! -f "$manifest" ]]; then
  echo "No manifest at $manifest — see the header of this script for the query." >&2
  exit 2
fi

# ── Deliberate exceptions ────────────────────────────────────────────────────
#
# 0030 and 0031 seeded test accounts. As APPLIED, 0030 contains a plaintext
# password literal; those credentials have since been rotated and the literal
# was stripped from git history. The files on disk are intentionally the
# neutered versions and MUST NOT be "repaired" from the ledger — doing so would
# put a credential back into the repository.
#
# Do not add to this list to silence a failure. A mismatch anywhere else means
# the file and the database genuinely disagree.
declare -A EXPECTED_DIVERGENT=(
  [20260825084530_0030_seed_test_users]="applied version contains a password literal; file is deliberately neutered"
  [20260825085639_0031_fix_test_user_auth_fixtures]="auth fixture repair, deliberately no longer applied from a migration"
)

exact=0; divergent=0; missing=0; unexpected=0
declare -A seen=()

while read -r stem want; do
  [[ -z "${stem:-}" ]] && continue
  seen["$stem"]=1
  f="$migdir/$stem.sql"

  if [[ ! -f "$f" ]]; then
    echo "MISSING   $stem.sql — applied to the database, absent from the repo"
    missing=$((missing+1)); continue
  fi

  # Both forms, because the ledger is inconsistent about the final newline.
  got_asis=$(md5sum "$f" | cut -d' ' -f1)
  got_chomped=$(perl -pe 'chomp if eof' "$f" | md5sum | cut -d' ' -f1)
  got="$got_asis (or $got_chomped chomped)"

  if [[ "$got_asis" == "$want" || "$got_chomped" == "$want" ]]; then
    exact=$((exact+1))
  elif [[ -n "${EXPECTED_DIVERGENT[$stem]:-}" ]]; then
    divergent=$((divergent+1))
    echo "divergent $stem.sql — expected: ${EXPECTED_DIVERGENT[$stem]}"
  else
    unexpected=$((unexpected+1))
    echo "DIFFERS   $stem.sql"
    echo "            applied md5 $want"
    echo "            file    md5 $got"
  fi
done < "$manifest"

# A file with no ledger entry is a migration that was written but never applied,
# or one applied under a different timestamp. Both break `supabase db reset`.
for f in "$migdir"/*.sql; do
  stem="$(basename "$f" .sql)"
  [[ -n "${seen[$stem]:-}" ]] || { echo "NOT APPLIED $stem.sql — in the repo, no ledger entry"; unexpected=$((unexpected+1)); }
done

echo
echo "exact=$exact  expected-divergent=$divergent  DIFFERS=$unexpected  MISSING=$missing"

if (( unexpected > 0 || missing > 0 )); then
  echo "FAIL — the repository cannot rebuild this database."
  exit 1
fi
echo "PASS — every applied migration has its SQL in the repository."

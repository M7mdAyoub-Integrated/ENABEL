#!/usr/bin/env bash
#
# Steps 3 and 4 of CLAUDE.md rule 5, for a migration applied through the MCP.
#
#   1. Write supabase/migrations/PENDING_<nnnn>_<name>.sql          (you)
#   2. Apply that exact text with apply_migration                    (you)
#   3. Read the version back and rename the file to match            (this)
#   4. Append the ledger line to .ledger_manifest and run the check  (this)
#
# Usage:
#   bash supabase/finish_pending_migration.sh "<version>_<nnnn>_<name> <md5>"
#
# The argument is the single ledger line produced by:
#
#   select version || '_' || name || ' ' || md5(array_to_string(statements, E';\n'))
#     from supabase_migrations.schema_migrations order by version desc limit 1;
#
# It refuses if the PENDING file's hash does not equal the ledger hash, because
# then the file is NOT what was applied and renaming it would only hide that.

set -euo pipefail

line="${1:?ledger line required}"
stem="${line%% *}"          # 20260913124844_0111_municipality
want="${line##* }"          # md5
version="${stem%%_*}"       # 20260913124844
suffix="${stem#*_}"         # 0111_municipality

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pending="$here/migrations/PENDING_${suffix}.sql"
final="$here/migrations/${stem}.sql"

[[ -f "$pending" ]] || { echo "no pending file at $pending" >&2; exit 2; }

got_asis=$(md5sum "$pending" | cut -d' ' -f1)
got_chomped=$(perl -pe 'chomp if eof' "$pending" | md5sum | cut -d' ' -f1)
if [[ "$got_asis" != "$want" && "$got_chomped" != "$want" ]]; then
  echo "REFUSED: $pending hashes to $got_asis ($got_chomped chomped), ledger says $want." >&2
  echo "The file is not what was applied. Fix the file to the applied text first." >&2
  exit 1
fi

if grep -q "^${stem} " "$here/.ledger_manifest"; then
  echo "manifest already has $stem"
else
  printf '%s\n' "$line" >> "$here/.ledger_manifest"
fi

git -C "$here/.." mv -f "$pending" "$final" 2>/dev/null || mv -f "$pending" "$final"
echo "renamed -> $(basename "$final")"

bash "$here/check_migration_files.sh"

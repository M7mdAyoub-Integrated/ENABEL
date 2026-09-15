#!/usr/bin/env node
/**
 * Make the generated database types compile: drop every `Relationships`
 * entry that points at a VIEW.
 *
 *   supabase gen types typescript --linked > src/types/database.ts
 *   node scripts/strip-view-relationships.mjs
 *
 * ── WHY ──
 *
 * `supabase gen types` lists, under each table's `Relationships`, one entry
 * per foreign key PER RELATION THAT EXPOSES THE REFERENCED COLUMN -- views
 * included. Since 0132 there are fifty-two views, thirty-seven of them
 * exposing `municipality_id`, so every scoped table's municipality key alone
 * produces some forty entries: 2 009 of the 2 256 relationships in the
 * 15 September 2026 output point at a view.
 *
 * supabase-js resolves an embed (`person!inner ( … )`) at the type level by
 * walking that list, and on the three selects whose embeds nest two deep
 * (completions.ts, linkage.ts ×2) TypeScript stops with TS2589, "type
 * instantiation is excessively deep". Measured rather than guessed: the
 * fresh types as generated give exactly those three errors; with the view
 * entries removed they give none; with the embed hints removed and the view
 * entries kept, the errors stay. The hints were suspected and are innocent.
 *
 * Nothing here embeds a view -- an embed target is a table with a foreign
 * key -- so these entries carry no information the app can use. Removing
 * them loses nothing and is the difference between a types file that is two
 * migrations stale (the state from 0132 to 0135, when regenerating "did not
 * work") and one that matches the schema.
 *
 * ── WHERE THE DEPTH COMES FROM (read in postgrest-js 2.112.4, unchanged in
 *    2.116.0, the latest on 15 September 2026) ──
 *
 * It is not a type recursing on itself and not the total amount of work:
 * the raw file costs 1.24 M instantiations against 0.96 M stripped, both far
 * under the 5 M cap. It is DEPTH. `DeduplicateRelationships<T>` walks a
 * table's Relationships tuple one conditional-type frame per entry --
 * `[First, ...DeduplicateRelationships<Rest>]`, not tail-recursive -- and
 * `ResolveJoinTableRelationship` maps it over EVERY table's list. TypeScript
 * stops a conditional type at 100 nested frames. With the view entries the
 * scoped tables carry 42-78 entries (app_user 78, exhibition_registration
 * 48, training_enrolment 44); a one-level embed fits under 100 and a
 * two-level one, with its outer frames, does not. Stripped, no list is
 * longer than 5. Upgrading the client does not change this, and the
 * generator has no switch for it, so this script stays.
 *
 * Idempotent; safe to run on an already-stripped file.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const file = join(here, '..', 'src', 'types', 'database.ts')

const before = readFileSync(file, 'utf8')

const entry =
  /\s*\{\s*\n\s*foreignKeyName: "[^"]+"\n\s*columns: \[[^\]]*\]\n\s*isOneToOne: (?:true|false)\n\s*referencedRelation: "(v_[^"]+)"\n\s*referencedColumns: \[[^\]]*\]\n\s*\},?/g

let removed = 0
let after = before.replace(entry, () => {
  removed++
  return ''
})
// A trailing comma left before the closing bracket of a list that lost its
// last entry.
after = after.replace(/,(\s*\n\s*\])/g, '$1')

const total = (before.match(/foreignKeyName:/g) ?? []).length
if (removed === 0) {
  console.log(`strip-view-relationships: nothing to do (${total} relationships, none to a view).`)
} else {
  writeFileSync(file, after)
  console.log(
    `strip-view-relationships: removed ${removed} relationship(s) pointing at views; ${total - removed} remain.`,
  )
}

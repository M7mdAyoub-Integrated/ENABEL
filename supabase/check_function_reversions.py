#!/usr/bin/env python3
"""
Did a later migration rewrite a function from an older copy?

── WHY THIS EXISTS ──

`create or replace function` takes the whole body, so it silently reverts
every later change to that function. 0082 re-signed save_followup_section_a
starting from 0079's text and dropped the read-back guard 0080 had added;
every check in the project passed, because every check was pointed at what
0082 added. CLAUDE.md's rule is "grep before replacing" — this is the grep,
run over the whole history at once.

── WHAT IT DOES ──

For every function defined by two or more migrations (`create function` and
`create or replace function` both count -- the first version of this script
matched only `or replace` and missed the signature changes 0115, 0118 and
0120 made with drop + create), take the versions in migration order. For
each version after the second, list the non-comment lines the PREVIOUS
version added over the one before it, and report any of them that the
current version no longer contains.

── HOW TO READ IT ──

It is a prompt to look, not a verdict. A flag means "the middle version
added a line and the next version does not have it verbatim"; that is
either a reversion or a rewording, and only the live body says which. On
15 September 2026 it raised 16 flags across the 134 migrations: one was the
documented reversion (0082 dropping 0080's guard, restored by 0083) and
fifteen were rewordings whose substance survives -- a gate extended to
super_admin, four inline tests moved into followup_indicator_reach, a
signature reformatted. It finds the real one, which is the calibration.

Run it after any migration that replaces a function, and read every flag
for that function against pg_get_functiondef.

    python supabase/check_function_reversions.py            # all functions
    python supabase/check_function_reversions.py submit_followup
"""
import glob
import os
import re
import sys

MIGDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations")

HEAD_RE = re.compile(
    r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\"?[a-z_0-9]+\"?)\s*\(", re.I
)
DOLLAR_RE = re.compile(r"\$[a-zA-Z_]*\$")


def extract(text):
    """Every function statement in a migration: (name, statement text)."""
    out = []
    pos = 0
    while True:
        m = HEAD_RE.search(text, pos)
        if not m:
            break
        name = m.group(1).strip('"')
        d = DOLLAR_RE.search(text, m.end())
        if not d:
            pos = m.end()
            continue
        tag = d.group(0)
        end = text.find(tag, d.end())
        if end < 0:
            pos = m.end()
            continue
        stmt_end = text.find(";", end + len(tag))
        out.append((name, text[m.start() : (stmt_end + 1 if stmt_end > 0 else end + len(tag))]))
        pos = end + len(tag)
    return out


def lines(stmt):
    return [l.rstrip() for l in stmt.replace("\r\n", "\n").split("\n") if l.strip()]


def main(only=None):
    files = sorted(glob.glob(os.path.join(MIGDIR, "*.sql")))
    history = {}
    for f in files:
        with open(f, encoding="utf-8", newline="") as fh:
            text = fh.read()
        mig = os.path.basename(f)[15:19]
        for name, stmt in extract(text):
            history.setdefault(name, []).append((mig, stmt))

    multi = {k: v for k, v in history.items() if len(v) >= 2 and (only is None or k == only)}
    print(f"{len(history)} functions defined in migrations; {len(multi)} defined more than once")
    flags = 0
    for name, versions in sorted(multi.items()):
        print(f"\n== {name}: " + " -> ".join(m for m, _ in versions))
        for k in range(2, len(versions)):
            older, middle, current = (lines(versions[i][1]) for i in (k - 2, k - 1, k))
            added_by_middle = [l for l in middle if l not in older]
            lost = [l for l in added_by_middle if l not in current and not l.strip().startswith("--")]
            if lost:
                flags += 1
                print(
                    f"   !! {versions[k][0]} drops {len(lost)} non-comment line(s) that "
                    f"{versions[k - 1][0]} had added over {versions[k - 2][0]}:"
                )
                for l in lost[:12]:
                    print("      - " + l[:140])
                if len(lost) > 12:
                    print(f"      ... and {len(lost) - 12} more")
    print(f"\nflags: {flags}  (each is a place to read the live body, not a failure)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))

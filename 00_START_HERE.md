# 00 — Start Here

This folder is the documentation set for the SHM M&E Platform database.

## Where to put it

```
your-repo/
├── CLAUDE.md                     ← move this to the repo root
├── docs/
│   ├── 00_START_HERE.md
│   ├── 01_PROJECT_CONTEXT.md
│   ├── 02_DATABASE_PLAN.md
│   ├── 03_INDICATORS.md
│   ├── 04_DATA_DICTIONARY.md
│   ├── 05_ROLES_AND_RLS.md
│   ├── 06_OPEN_QUESTIONS.md
│   └── 07_BUILD_CHECKLIST.md
└── supabase/migrations/          ← Claude Code writes here
```

`CLAUDE.md` must sit at the repo root. Claude Code loads it automatically at the start of every session. The rest are read on demand.

## Reading order

| If you are | Read |
|---|---|
| Starting the build | CLAUDE.md, then 07, then 02 |
| Writing a table | 02, then 04 for the fields |
| Writing an indicator view | 03, nothing else |
| Writing RLS | 05 |
| Stuck on a definition | 06 — it is probably a known conflict |
| New to the programme | 01 |

## The one rule

**Do not guess.** Eighteen decisions in this project are genuinely unsettled and they are all listed in 06. Guessing produces a number that looks right in a donor report and is wrong.

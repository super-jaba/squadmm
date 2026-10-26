# squadmm

Recruiter-to-role matchmaking for Squad. For every open role it finds recruiters for whom the payout works. An LLM then judges each recruiter's fit as **STRONG / MEDIUM / WEAK**, with a short explanation addressed to the recruiter.

## Setup

Requires Node 22+ and Docker.

```bash
npm install

# 1. Postgres (defaults: squad/squad@localhost:5432/squad)
docker compose up -d

# 2. Restore the dump (see dbsetup/DATABASE-SETUP.md; the dump needs pg_trgm)
docker compose exec -T db psql -U squad squad -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
docker compose exec -T db psql -U squad squad < dbsetup/squad-dump-2026-03-09-140846.sql

# 3. Migrations, in order
for f in sql/*.sql; do docker compose exec -T db psql -U squad squad < "$f"; done

# 4. Config
cp .env.example .env   # then set OPENAI_API_KEY

npm run build
```

### Environment variables

| Variable | Default | |
|---|---|---|
| `DB_URL` | `postgres://squad:squad@localhost:5432/squad` | |
| `DEFAULT_RATE_PERCENT` | `9` | Recruiter commission when there's no `RateAdjustment` |
| `OPENAI_API_KEY` | — | Required for real runs (not for `--dry-run` or `recruiter`) |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Must support strict JSON-schema output and `temperature: 0` |
| `MATCH_CONCURRENCY` | `5` | Recruiters judged in parallel per role |
| `PORT` | `3000` | Web UI port |

## CLI

```bash
node dist/index.js role <roleId>              # match one role
node dist/index.js backfill [--limit N]       # match every role worth considering (~79)
node dist/index.js recruiter <userId>         # a recruiter's matches, STRONG → MEDIUM → WEAK

# add --dry-run to role/backfill to print the prompts without calling the API
node dist/index.js role <roleId> --dry-run
```

Re-running a role refreshes its existing matches; it never creates duplicates.

## Web UI

```bash
npm run web   # builds, then serves http://localhost:3000 (PORT=4000 npm run web to change)
```

A read-only view of the database: browse recruiters (searchable by name or email), open one to see their profile, stated preferences and matches, and filter the matches by strength. `/matches` lists every match, sortable by strength; clicking one opens its recruiter. On a recruiter page, clicking a match opens the full role (details, requirements, job description) in a new tab.

## How matching works

The recommender favours **precision over recall**, because a plain search UI already exists. A STRONG should be a role the recruiter would trust on sight. Matching is recruiter ↔ role. A recruiter's current candidate pool is irrelevant, since they source per role.

1. **Gate** (`src/workflow.ts`, `src/utils.ts`). The role must be active and accepting submissions (`worthConsidering`). The recruiter's payout on it must be at least what they've accepted before, and they must not have applied to it yet (`findRecruiters`).
2. **Context** (`src/context.ts`). For each (role, recruiter) pair:
   - **Role card:** title, company and segment, skill names, location and arrangement, comp and the must-haves (truncated). The payout isn't shown to the model: the gate already handled it, and the model only made off-topic comments about it.
   - **Track record:** the recruiter's 5 most recent *relevant* roles. An application is relevant if the recruiter submitted it themselves (`DASHBOARD`) or the candidate reached the client (stage set, or a status such as shared, placed or rejected by client). Squad's automated `AI_WORKFLOW` applications that never reached a client are ignored. Each role carries its furthest outcome (*advanced*, *shared with client* or *self-submitted*) and the latest client stage.
   - **Choices:** the 5 most recently saved roles.
   - **Stated preferences**, flagged as weak when they weren't asked from the recruiter.
3. **Judge** (`src/judge.ts`, `src/prompt.ts`). The model returns strict JSON in the order `reasoning → strength → evidence`, so it reasons before deciding. It runs at temperature 0. The rubric ranks signals as track record > choices > preferences and compares roles semantically (e.g. Solidity ≈ DeFi protocol). STRONG requires evidence of both interest and ability, and no conflicts. Empty history sections are left out of the prompt, and the reasoning is prefixed with `NO APPLICATIONS` / `NO SAVED JOBS` so it's clear what the judge didn't see. Recruiters with no history and no preferences get WEAK without an LLM call.
4. **Store.** Results are upserted into `"Match"` with `evidence` (the ids of the history items the model cited; ids it made up are dropped), `model`, `promptVersion` and `updatedAt`. If a call still fails after 3 attempts, it is logged and nothing is stored. Bump `PROMPT_VERSION` when the prompt changes to tell stale matches apart.

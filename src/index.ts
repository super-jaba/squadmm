import { settings } from './config.js'
import { db, query } from './db.js'
import { MatchStrength, Role } from './models.js'
import { SYSTEM_PROMPT } from './prompt.js'
import { worthConsidering } from './utils.js'
import { type MatchCounts, matchRole } from './workflow.js'

const USAGE = `Usage:
  node dist/index.js role <roleId> [--dry-run]       match one role
  node dist/index.js backfill [--limit N] [--dry-run] match every role worth considering
  node dist/index.js recruiter <userId>               show a recruiter's matches`

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitAt = args.indexOf('--limit')
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : undefined
const [command, id] = args.filter((arg, i) => !arg.startsWith('--') && (limitAt < 0 || i !== limitAt + 1))

function needsApiKey(): void {
  if (!dryRun && !settings.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set; add it to .env or use --dry-run')
  if (dryRun) console.log(`=== system prompt\n${SYSTEM_PROMPT}`)
}

function formatCounts(c: MatchCounts): string {
  return `${c.STRONG} strong, ${c.MEDIUM} medium, ${c.WEAK} weak${c.failed ? `, ${c.failed} failed` : ''}`
}

async function matchOneRole(roleId: string): Promise<void> {
  needsApiKey()
  const counts = await matchRole(roleId, { dryRun })
  if (!counts) console.log('Role not found or not worth considering.')
  else if (!dryRun) console.log(formatCounts(counts))
}

async function backfill(): Promise<void> {
  if (limit !== undefined && !(limit > 0)) throw new Error('--limit must be a positive number')
  needsApiKey()
  const roles = query('SELECT * FROM "Role" ORDER BY "createdAt"')
    .map((row) => Role.parse(row))
    .filter(worthConsidering)
    .slice(0, limit)

  for (const [i, role] of roles.entries()) {
    const counts = await matchRole(role.id, { dryRun })
    const summary = counts ? formatCounts(counts) : 'skipped'
    console.log(`[${i + 1}/${roles.length}] ${role.role ?? 'Untitled role'} (${role.id}): ${dryRun ? 'dry run' : summary}`)
  }
}

function showRecruiter(userId: string): void {
  const [user] = query<{ name: string | null }>('SELECT name FROM "User" WHERE id = $1', [userId])
  if (!user) throw new Error(`No user ${userId}`)

  const matches = query<{ strength: MatchStrength; reasoning: string | null; roleId: string; title: string | null; company: string | null }>(
    `SELECT m.strength, m.reasoning, m."roleId", r.role AS title, co.name AS company
     FROM "Match" m
     JOIN "Role" r ON r.id = m."roleId"
     LEFT JOIN "Company" co ON co.id = r."companyId"
     WHERE m."userId" = $1
     ORDER BY COALESCE(m."updatedAt", m."createdAt") DESC`,
    [userId],
  )

  console.log(`Matches for ${user.name ?? userId} (${matches.length})`)
  for (const strength of MatchStrength.options) {
    const group = matches.filter((m) => m.strength === strength)
    if (group.length === 0) continue
    console.log(`\n${strength} (${group.length})`)
    for (const m of group) {
      console.log(`  • ${m.title ?? 'Untitled role'} · ${m.company ?? 'unknown company'} (${m.roleId})`)
      if (m.reasoning) console.log(`    ${m.reasoning}`)
    }
  }
}

try {
  if (command === 'role' && id) await matchOneRole(id)
  else if (command === 'backfill') await backfill()
  else if (command === 'recruiter' && id) showRecruiter(id)
  else {
    console.log(USAGE)
    process.exitCode = 1
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  db.end()
}

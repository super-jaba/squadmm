import { settings } from './config.js'
import { query } from './db.js'
import { type MatchStrength, Role } from './models.js'
import { findRecruiters, match, type MatchOptions, worthConsidering } from './utils.js'

export type MatchCounts = Record<MatchStrength | 'failed', number>

// Returns null if the role doesn't exist or isn't worth considering
export async function matchRole(roleId: string, options: MatchOptions = {}): Promise<MatchCounts | null> {
  // Fetches the role from the database
  const [row] = query('SELECT * FROM "Role" WHERE id = $1', [roleId])
  if (!row) return null
  const role = Role.parse(row)

  // Check if worth Considering, otherwise exit the function
  if (!worthConsidering(role)) return null

  const counts: MatchCounts = { STRONG: 0, MEDIUM: 0, WEAK: 0, failed: 0 }
  const queue = findRecruiters(role)

  // Small worker pool. DB calls are sync, so only the LLM requests overlap.
  const worker = async () => {
    for (let recruiterId = queue.shift(); recruiterId !== undefined; recruiterId = queue.shift()) {
      const result = await match(role.id, recruiterId, options)
      if (result) counts[result.strength]++
      else if (!options.dryRun) counts.failed++
    }
  }
  await Promise.all(Array.from({ length: settings.MATCH_CONCURRENCY }, worker))

  return counts
}

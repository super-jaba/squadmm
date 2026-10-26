import { settings } from './config.js'
import { query } from './db.js'
import type { Role } from './models.js'

// Function checking the role is worth working out
export function worthConsidering(role: Role): boolean {
  // 1. Role is active
  const active = role.deletedAt === null && role.statusInternal === 'Matchmaking'
  // 2. Role is accepting new submissions
  const accepting = role.isAcceptingNewSubmissions === true
  return active && accepting
}

// Find recruiters that fall within the compensation rate
export function findRecruiters(role: Role): string[] {
  // 1. compute dollar-payout: rate% * maxCompensation (unknown comp => 0).
  //    The rate is per recruiter (RateAdjustment), so the final figure is computed in SQL.
  const maxComp = Number(role.maxCompensation) || 0

  // 2. find recruiters who historically agreed to this payouts and haven't applied to the role yet.
  //    "Agreed" = their lowest payout across past submissions is <= this role's payout to them.
  //    Past roles with unknown comp are left out of the history.
  const rows = query<{ id: string }>(
    `WITH history AS (
       SELECT c."userId" AS "recruiterId",
              MIN(COALESCE(ra."ratePercent", $3) / 100 * r."maxCompensation"::numeric) AS "minPayout"
       FROM "CandidateApplication" ca
       JOIN "Candidate" c ON c.id = ca."candidateId"
       JOIN "Role" r ON r.id = ca."roleId"
       LEFT JOIN "RateAdjustment" ra ON ra."recruiterId" = c."userId" AND ra."roleId" = r.id
       WHERE ca."deletedAt" IS NULL AND c."deletedAt" IS NULL
         AND NULLIF(r."maxCompensation", '') IS NOT NULL
       GROUP BY c."userId"
     )
     SELECT u.id
     FROM "User" u
     JOIN history h ON h."recruiterId" = u.id
     LEFT JOIN "RateAdjustment" ra ON ra."recruiterId" = u.id AND ra."roleId" = $1
     WHERE u."userType" = 'RECRUITER' AND u.active IS NOT FALSE AND u."deletedAt" IS NULL
       AND h."minPayout" <= COALESCE(ra."ratePercent", $3) / 100 * $2
       AND NOT EXISTS (
         SELECT 1 FROM "CandidateApplication" ca
         JOIN "Candidate" c ON c.id = ca."candidateId"
         WHERE ca."roleId" = $1 AND c."userId" = u.id AND ca."deletedAt" IS NULL
       )`,
    [role.id, maxComp, settings.DEFAULT_RATE_PERCENT],
  )

  // 3. Return recruiter ids
  return rows.map((r) => r.id)
}

// Compute match between a recruiter and a role
export function match(roleId: string, recruiterId: string): number {
  throw new Error('Not implemented')
}

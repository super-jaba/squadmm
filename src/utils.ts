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
function findRecruiters(role) {
  // 1. compute dollar-payout
  // 2. find recruiters who historically agreed to this payouts and haven't applied to the role yet
  // 3. Return recruiter ids
}

// Compute match between a recruiter and a role
function match(role_id, recruiter_id) {

}

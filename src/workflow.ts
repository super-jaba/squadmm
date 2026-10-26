import { query } from './db.js'
import { Role } from './models.js'
import { findRecruiters, match, worthConsidering } from './utils.js'

export function matchRole(roleId: string): void {
  // Fetches the role from the database
  const [row] = query('SELECT * FROM "Role" WHERE id = $1', [roleId])
  if (!row) return
  const role = Role.parse(row)

  // Check if worth Considering, otherwise exit the function
  if (!worthConsidering(role)) return

  for (const recruiterId of findRecruiters(role)) {
    match(role.id, recruiterId)
  }
}

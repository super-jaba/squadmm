import { query } from './db.js'

const MUST_HAVES_MAX_CHARS = 1500

// Application reached the client: a stage is set, or a status that only happens after sharing
const SHARED = `(ca."stageWithClient" IS NOT NULL OR ca."internalStatus" IN (
  'Shared with client', 'In process with client', 'To be shared with client',
  'Placed', 'Accepted by client', 'Rejected by client'))`

// Candidate got past the first interview round (or was placed)
const ADVANCED = `(ca."stageWithClient" ~ '(2nd|3rd|4th|Final|Negotiation|Placed|Reference)'
  OR ca."internalStatus" IN ('Placed', 'Accepted by client'))`

// Skill names of role r
const SKILL_NAMES = `ARRAY(SELECT s.name FROM "Skill" s WHERE s.id = ANY(r."skills_fk_Skill") ORDER BY s.name)`

export type RoleCard = {
  id: string
  title: string | null
  company: string | null
  segment: string | null
  skills: string[]
  requiredLocation: string | null
  roleType: string | null // comma-separated, e.g. "Remote, Hybrid"
  continents: string | null
  requiredOverlap: string | null
  comp: string | null // free text
  maxCompensation: string | null
  rolePriority: string | null
  mustHaves: string | null // truncated requirementsStructured
}

export type HistoryRole = {
  title: string | null
  company: string | null
  skills: string[]
}

export type Outcome = 'advanced' | 'shared with client' | 'self-submitted'

export type WorkedRole = HistoryRole & {
  outcome: Outcome // furthest outcome over the recruiter's applications to the role
  latestStage: string | null // raw latest stageWithClient, e.g. "Placed", "Rejected"
}

export type Preferences = {
  roleTypes: string[] // Tech / Non-tech
  locations: string[]
  specialties: string[]
  freeText: string | null
  asked: boolean // false => the fields weren't collected from the recruiter
}

export type RecruiterContext = {
  recruiterId: string
  preferences: Preferences
  saved: HistoryRole[] // newest first
  worked: WorkedRole[] // newest first
}

export function loadRoleCard(roleId: string): RoleCard | null {
  const [row] = query<Omit<RoleCard, 'mustHaves'> & { requirementsStructured: string | null }>(
    `SELECT r.id, r.role AS title, co.name AS company, co.segment, ${SKILL_NAMES} AS skills,
            r."requiredLocation", r."roleType", r.continents, r."requiredOverlap", r.comp,
            r."maxCompensation", r."rolePriority", r."requirementsStructured"
     FROM "Role" r
     LEFT JOIN "Company" co ON co.id = r."companyId"
     WHERE r.id = $1`,
    [roleId],
  )
  if (!row) return null
  const { requirementsStructured, ...card } = row
  return { ...card, mustHaves: truncate(requirementsStructured, MUST_HAVES_MAX_CHARS) }
}

export function loadRecruiterContext(recruiterId: string, role: RoleCard): RecruiterContext {
  const [preferences] = query<Preferences>(
    `SELECT COALESCE(u."rolePreferences", '{}') AS "roleTypes",
            COALESCE(u."locationPreference", '{}') AS locations,
            COALESCE(u."otherPreferences", '{}') AS specialties,
            NULLIF(trim(u."recruiterPreference"), '') AS "freeText",
            COALESCE(u."askedPreferences", false) AS asked
     FROM "User" u
     WHERE u.id = $1`,
    [recruiterId],
  )

  const saved = query<HistoryRole>(
    `SELECT r.role AS title, co.name AS company, ${SKILL_NAMES} AS skills
     FROM "SavedRole" sr
     JOIN "Role" r ON r.id = sr."roleId"
     LEFT JOIN "Company" co ON co.id = r."companyId"
     WHERE sr."userId" = $1 AND sr."roleId" <> $2
     ORDER BY sr."savedAt" DESC
     LIMIT 5`,
    [recruiterId, role.id],
  )

  // Distinct roles from the recruiter's relevant (non-junk) applications, most recent first.
  // Relevant = the recruiter chose to submit (DASHBOARD) or the candidate reached the client.
  const worked = query<HistoryRole & { advanced: boolean | null; shared: boolean | null; latestStage: string | null }>(
    `WITH relevant AS (
       SELECT ca."roleId", ca."createdAt", ca."stageWithClient",
              ${SHARED} AS shared, ${ADVANCED} AS advanced
       FROM "CandidateApplication" ca
       JOIN "Candidate" c ON c.id = ca."candidateId"
       WHERE c."userId" = $1 AND ca."deletedAt" IS NULL AND c."deletedAt" IS NULL
         AND ca."roleId" IS NOT NULL AND ca."roleId" <> $2
         AND (ca."applicationOrigin" = 'DASHBOARD' OR ${SHARED})
     ), per_role AS (
       SELECT "roleId", max("createdAt") AS "lastAt", bool_or(advanced) AS advanced, bool_or(shared) AS shared,
              (array_agg("stageWithClient" ORDER BY "createdAt" DESC)
                 FILTER (WHERE "stageWithClient" IS NOT NULL))[1] AS "latestStage"
       FROM relevant
       GROUP BY "roleId"
       ORDER BY "lastAt" DESC
       LIMIT 5
     )
     SELECT r.role AS title, co.name AS company, ${SKILL_NAMES} AS skills,
            p.advanced, p.shared, p."latestStage"
     FROM per_role p
     JOIN "Role" r ON r.id = p."roleId"
     LEFT JOIN "Company" co ON co.id = r."companyId"
     ORDER BY p."lastAt" DESC`,
    [recruiterId, role.id],
  ).map(({ advanced, shared, ...rest }): WorkedRole => ({
    ...rest,
    outcome: advanced ? 'advanced' : shared ? 'shared with client' : 'self-submitted',
  }))

  return {
    recruiterId,
    preferences: preferences ?? { roleTypes: [], locations: [], specialties: [], freeText: null, asked: false },
    saved,
    worked,
  }
}

function truncate(text: string | null, max: number): string | null {
  if (!text) return null
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

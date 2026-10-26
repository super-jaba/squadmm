import { createServer, type ServerResponse } from 'node:http'
import { settings } from './config.js'
import { SKILL_NAMES } from './context.js'
import { db, pgArray, query } from './db.js'
import { MatchStrength } from './models.js'
import {
  errorPage,
  type MatchListRow,
  matchListPage,
  type MatchRow,
  notFoundPage,
  type Recruiter,
  recruiterListPage,
  recruiterPage,
  type RecruiterRow,
  type RoleDetail,
  rolePage,
  type StrengthCounts,
  type StrengthOrder,
} from './views.js'

function listRecruiters(q: string): RecruiterRow[] {
  return query<RecruiterRow>(
    `SELECT u.id, u.name, u.email, u.active, u."lastLogin",
            count(m.id) FILTER (WHERE m.strength = 'STRONG')::int AS "STRONG",
            count(m.id) FILTER (WHERE m.strength = 'MEDIUM')::int AS "MEDIUM",
            count(m.id) FILTER (WHERE m.strength = 'WEAK')::int AS "WEAK"
     FROM "User" u
     LEFT JOIN "Match" m ON m."userId" = u.id
     WHERE u."userType" = 'RECRUITER' AND u."deletedAt" IS NULL
       AND ($1::text = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
     GROUP BY u.id
     ORDER BY "STRONG" DESC, "MEDIUM" DESC, count(m.id) DESC, u.name NULLS LAST`,
    [q],
  )
}

function loadRecruiter(id: string): Recruiter | null {
  const [row] = query<Recruiter>(
    `SELECT u.id, u.name, u.email, u.active, u."lastLogin", u."createdAt",
            COALESCE(u."rolePreferences", '{}') AS "roleTypes",
            COALESCE(u."locationPreference", '{}') AS locations,
            COALESCE(u."otherPreferences", '{}') AS specialties,
            NULLIF(trim(u."recruiterPreference"), '') AS "freeText",
            COALESCE(u."askedPreferences", false) AS asked
     FROM "User" u
     WHERE u.id = $1 AND u."userType" = 'RECRUITER' AND u."deletedAt" IS NULL`,
    [id],
  )
  return row ?? null
}

// STRONG → MEDIUM → WEAK, newest first within a strength
function loadMatches(userId: string, strengths: MatchStrength[]): MatchRow[] {
  return query<MatchRow>(
    `SELECT m."roleId", m.strength, m.reasoning, m.model, m."promptVersion",
            COALESCE(m."updatedAt", m."createdAt") AS "matchedAt",
            r.role AS title, co.name AS company, r.comp, r."roleType", r."requiredLocation",
            ${SKILL_NAMES} AS skills
     FROM "Match" m
     JOIN "Role" r ON r.id = m."roleId"
     LEFT JOIN "Company" co ON co.id = r."companyId"
     WHERE m."userId" = $1 AND m.strength = ANY($2::text[])
     ORDER BY array_position($3::text[], m.strength), "matchedAt" DESC`,
    [userId, pgArray(strengths), pgArray(MatchStrength.options)],
  )
}

// Every match, by strength (then newest first)
function listMatches(order: StrengthOrder): MatchListRow[] {
  const strengths = order === 'strongest' ? MatchStrength.options : [...MatchStrength.options].reverse()
  return query<MatchListRow>(
    `SELECT m."userId", u.name AS recruiter, m."roleId", r.role AS title, co.name AS company, m.strength,
            COALESCE(m."updatedAt", m."createdAt") AS "matchedAt"
     FROM "Match" m
     JOIN "User" u ON u.id = m."userId"
     JOIN "Role" r ON r.id = m."roleId"
     LEFT JOIN "Company" co ON co.id = r."companyId"
     ORDER BY array_position($1::text[], m.strength), "matchedAt" DESC`,
    [pgArray(strengths)],
  )
}

function loadRole(id: string): RoleDetail | null {
  const [row] = query<RoleDetail>(
    `SELECT r.id, r."internalId", r.role AS title, r."statusInternal", r."rolePriority", r."isAcceptingNewSubmissions",
            r."roleType", r."requiredLocation", r."requiredOverlap", r.continents, r.countries, r.comp,
            r."maxCompensation", r."enhancedJd", r."requirementsStructured", COALESCE(r."keyIndicators", '{}') AS "keyIndicators",
            ${SKILL_NAMES} AS skills, r."createdAt", r."updatedAt", r."deletedAt",
            co.name AS company, co.segment, co."companyUrl"
     FROM "Role" r
     LEFT JOIN "Company" co ON co.id = r."companyId"
     WHERE r.id = $1`,
    [id],
  )
  return row ?? null
}

function countMatches(userId: string): StrengthCounts {
  const counts: StrengthCounts = { STRONG: 0, MEDIUM: 0, WEAK: 0 }
  const rows = query<{ strength: MatchStrength; n: number }>(
    `SELECT strength, count(*)::int AS n FROM "Match" WHERE "userId" = $1 GROUP BY strength`,
    [userId],
  )
  for (const { strength, n } of rows) counts[strength] = n
  return counts
}

// ?strength=STRONG&strength=MEDIUM; unknown values are ignored, none means all
function parseStrengths(params: URLSearchParams): MatchStrength[] {
  const picked = params.getAll('strength').flatMap((s) => {
    const parsed = MatchStrength.safeParse(s)
    return parsed.success ? [parsed.data] : []
  })
  return picked.length ? MatchStrength.options.filter((s) => picked.includes(s)) : [...MatchStrength.options]
}

function send(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(body)
}

const server = createServer((req, res) => {
  try {
    if (req.method !== 'GET') return send(res, 405, notFoundPage('Only GET is supported.'))
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === '/') {
      const q = url.searchParams.get('q')?.trim() ?? ''
      return send(res, 200, recruiterListPage(listRecruiters(q), q))
    }

    if (url.pathname === '/matches') {
      const order: StrengthOrder = url.searchParams.get('order') === 'weakest' ? 'weakest' : 'strongest'
      return send(res, 200, matchListPage(listMatches(order), order))
    }

    const recruiterPath = /^\/recruiters\/([^/]+)$/.exec(url.pathname)
    if (recruiterPath?.[1]) {
      const id = decodeURIComponent(recruiterPath[1])
      const recruiter = loadRecruiter(id)
      if (!recruiter) return send(res, 404, notFoundPage(`No recruiter ${id}.`))
      const strengths = parseStrengths(url.searchParams)
      return send(res, 200, recruiterPage(recruiter, loadMatches(id, strengths), countMatches(id), strengths))
    }

    const rolePath = /^\/roles\/([^/]+)$/.exec(url.pathname)
    if (rolePath?.[1]) {
      const id = decodeURIComponent(rolePath[1])
      const role = loadRole(id)
      return role ? send(res, 200, rolePage(role)) : send(res, 404, notFoundPage(`No role ${id}.`))
    }

    send(res, 404, notFoundPage(`Nothing at ${url.pathname}.`))
  } catch (err) {
    console.error(err)
    send(res, 500, errorPage())
  }
})

server.listen(settings.PORT, () => console.log(`Listening on http://localhost:${settings.PORT}`))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    db.end()
    process.exit(0)
  })
}

import { z } from 'zod'

export const RoleStatus = z.enum(['Draft', 'Matchmaking', 'On hold', 'Closed Won', 'Closed Lost'])
export type RoleStatus = z.infer<typeof RoleStatus>

export const RolePriority = z.enum(['Low', 'Medium', 'High', 'Critical'])
export type RolePriority = z.infer<typeof RolePriority>

// Row of public."Role". Unknown columns (airtable/whalesync sync fields etc.) are stripped,
// so `SELECT *` parses fine.
export const Role = z.object({
  id: z.string(),
  internalId: z.number().int().nullable(), // the "ID" shown in the dashboard
  role: z.string().nullable(), // title
  companyId: z.string().nullable(),
  statusInternal: RoleStatus.nullable(),
  rolePriority: RolePriority.nullable(),
  isAcceptingNewSubmissions: z.boolean().nullable(),
  roleType: z.string().nullable(), // comma-separated, e.g. "Remote, Hybrid"
  skills_fk_Skill: z.array(z.string()),
  keyIndicators: z.array(z.string()),
  requiredLocation: z.string().nullable(),
  requiredOverlap: z.string().nullable(),
  continents: z.string().nullable(),
  countries: z.string().nullable(),
  comp: z.string().nullable(), // free text, e.g. "$150-210k base + equity"
  maxCompensation: z.string().nullable(),
  enhancedJd: z.string().nullable(),
  requirementsStructured: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
})

export type Role = z.infer<typeof Role>

export const MatchStrength = z.enum(['STRONG', 'MEDIUM', 'WEAK'])
export type MatchStrength = z.infer<typeof MatchStrength>

// Row of public."Match"
export const Match = z.object({
  id: z.string(),
  roleId: z.string(),
  userId: z.string(), // recruiter
  createdAt: z.date(),
  reasoning: z.string().nullable(), // free text
  strength: MatchStrength,
  evidence: z.array(z.string()).nullable(), // history item ids the judge cited, e.g. "S2", "A1"
  model: z.string().nullable(), // null when decided without an LLM call
  promptVersion: z.string().nullable(),
  updatedAt: z.date().nullable(),
})

export type Match = z.infer<typeof Match>

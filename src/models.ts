import { z } from 'zod'

export const RoleStatus = z.enum(['Draft', 'Matchmaking', 'On hold', 'Closed Won', 'Closed Lost'])
export type RoleStatus = z.infer<typeof RoleStatus>

export const RolePriority = z.enum(['Low', 'Medium', 'High', 'Critical'])
export type RolePriority = z.infer<typeof RolePriority>

export const RoleType = z.enum(['Remote', 'Hybrid', 'In-person'])
export type RoleType = z.infer<typeof RoleType>

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
  // Comma-separated in the DB, e.g. "Remote, Hybrid"
  roleType: z
    .string()
    .nullable()
    .transform((s) => (s ? s.split(',').map((t) => t.trim()) : []))
    .pipe(z.array(RoleType)),
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

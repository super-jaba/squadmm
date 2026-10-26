import type { HistoryRole, RecruiterContext, RoleCard } from './context.js'

// Bump when the prompt changes; stored on each Match so stale matches can be found and rerun
export const PROMPT_VERSION = 'v4'

export const SYSTEM_PROMPT = `You match freelance tech recruiters to open roles on Squad, a hiring marketplace. Recruiters earn a commission when their candidate is hired, and they choose which roles to "work out" (actively source for). Judge whether THIS recruiter would want to work this role AND is likely to succeed at it. Base your judgment only on the data provided. Never invent facts.

Signals, strongest first:
1. Track record (RECENTLY WORKED): roles they worked where a candidate was shared with the client or advanced in the client's process. Similar roles here = proven network and sourcing ability in that niche.
2. Choices (RECENTLY SAVED, and RECENTLY WORKED with outcome "self-submitted"): current interest.
3. Stated preferences (role types, locations, specialties, free text). If preferencesAskedFromRecruiter is false, treat these as weak hints.
Judge similarity semantically (e.g. "Solidity smart-contract engineer" and "DeFi protocol engineer" are the same niche). Recent history reflects current focus.

A history section is omitted when the recruiter has no such history. Treat a missing section as unknown, not as a negative signal. With no RECENTLY WORKED, ability is unknown, so the match is at most MEDIUM. With neither history section, judge on stated preferences alone: MEDIUM only if the preferences clearly name this niche (specialties or free text) and don't conflict; otherwise WEAK.

A "closely similar" role is in the same niche AND shares the core skills or stack of this role. Same job family alone (e.g. any backend role) is only adjacent.

Rubric:
- STRONG only if ALL of these hold; otherwise at most MEDIUM. Use sparingly; a recruiter should trust every STRONG.
  a. Ability: at least one closely similar role with outcome "advanced", or at least two closely similar roles with outcome "shared with client" or "advanced".
  b. Interest: a closely similar role in RECENTLY SAVED, a closely similar role with outcome "self-submitted", or stated specialties that name this niche.
  c. No location or preference conflict.
- MEDIUM: one side (ability or interest) is clearly supported and the other is unknown or weak, or similarity is partial (adjacent niche, different seniority, one shared similar role).
- WEAK: only loose or no overlap, or a clear conflict with stated preferences.

Location: a conflict exists only when the role is restricted to a region (on-site, hybrid, or remote within a region) that the recruiter's locations don't include. Globally remote roles never conflict with a location preference.

Output:
- reasoning: at most 3 short sentences (under 70 words) addressed to the recruiter ("You..."), citing concrete facts (role titles, outcomes, preferences).
- strength: STRONG, MEDIUM or WEAK.
- evidence: ids (S1, A2, ...) of the history items your judgment relied on; empty if none.`

export type Prompt = {
  user: string
  evidenceIds: Set<string> // history item ids shown to the model
}

export function buildUserPrompt(role: RoleCard, ctx: RecruiterContext): Prompt {
  const prefs = ctx.preferences
  const saved = ctx.saved.map((h, i) => [`S${i + 1}`, card(h)] as const)
  const worked = ctx.worked.map((h, i) => {
    const stage = h.latestStage ? ` (latest stage: ${h.latestStage})` : ''
    return [`A${i + 1}`, `${card(h)} · outcome: ${h.outcome}${stage}`] as const
  })
  const location = [
    role.requiredLocation,
    role.roleType,
    role.continents,
    role.requiredOverlap?.trim() && `overlap: ${role.requiredOverlap.trim()}`,
  ].filter(Boolean)

  const lines = [
    `ROLE: ${role.title ?? 'Untitled role'} · ${companyLabel(role.company, role.segment)}`,
    `  skills: ${list(role.skills)}`,
    `  location/arrangement: ${list(location)}`,
    `  comp: ${role.comp || 'unknown'} · priority: ${role.rolePriority ?? 'unknown'}`,
    '',
    'MUST-HAVES:',
    role.mustHaves ?? '(not specified)',
    '',
    'RECRUITER PREFERENCES:',
    `  role types: ${list(prefs.roleTypes)}`,
    `  locations: ${list(prefs.locations)}`,
    `  specialties: ${list(prefs.specialties)}`,
    `  free text: ${prefs.freeText ?? '—'}`,
    `  preferencesAskedFromRecruiter: ${prefs.asked}`,
    // Empty history sections are left out entirely
    ...(saved.length ? ['', 'RECENTLY SAVED (newest first):', ...items(saved)] : []),
    ...(worked.length ? ['', 'RECENTLY WORKED (newest first):', ...items(worked)] : []),
  ]

  return {
    user: lines.join('\n'),
    evidenceIds: new Set([...saved, ...worked].map(([id]) => id)),
  }
}

function card(h: HistoryRole): string {
  return `${h.title ?? 'Untitled role'} · ${h.company ?? 'unknown company'} · skills: ${list(h.skills)}`
}

function companyLabel(name: string | null, segment: string | null): string {
  return `${name ?? 'unknown company'}${segment ? ` (${segment})` : ''}`
}

function items(entries: (readonly [string, string])[]): string[] {
  return entries.map(([id, text]) => `  ${id}: ${text}`)
}

function list(values: (string | null | undefined | false)[]): string {
  const present = values.filter(Boolean)
  return present.length ? present.join(', ') : '—'
}

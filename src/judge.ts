import OpenAI from 'openai'
import { z } from 'zod'
import { settings } from './config.js'
import type { RecruiterContext, RoleCard } from './context.js'
import { MatchStrength } from './models.js'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt.js'

export type Judgment = {
  strength: MatchStrength
  reasoning: string
  evidence: string[] // history item ids, e.g. "S2", "A1"
  model: string | null // null when decided without an LLM call
}

// Field order matters: the model writes its reasoning before committing to a strength
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: { type: 'string' },
    strength: { type: 'string', enum: MatchStrength.options },
    evidence: { type: 'array', items: { type: 'string' } },
  },
  required: ['reasoning', 'strength', 'evidence'],
  additionalProperties: false,
}

const JudgeResponse = z.object({
  reasoning: z.string().min(1),
  strength: MatchStrength,
  evidence: z.array(z.string()),
})

let client: OpenAI | undefined

function openai(): OpenAI {
  if (!settings.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set; add it to .env')
  // maxRetries: 2 => at most 3 attempts; the SDK backs off on 429, 5xx and connection errors
  client ??= new OpenAI({ apiKey: settings.OPENAI_API_KEY, maxRetries: 2 })
  return client
}

// Nothing to judge on: no saved roles, no relevant applications, no preferences
export function hasNoSignal(ctx: RecruiterContext): boolean {
  const p = ctx.preferences
  return (
    ctx.saved.length === 0 &&
    ctx.worked.length === 0 &&
    p.roleTypes.length === 0 &&
    p.locations.length === 0 &&
    p.specialties.length === 0 &&
    p.freeText === null
  )
}

// Labels for history the judge didn't get, prepended to the reasoning
export function missingDataPrefix(ctx: RecruiterContext): string {
  const tags = [ctx.worked.length === 0 && 'NO APPLICATIONS', ctx.saved.length === 0 && 'NO SAVED JOBS'].filter(Boolean)
  return tags.map((t) => `${t}. `).join('')
}

// Returns null when the LLM call fails (after retries) or returns an invalid answer.
export async function judge(role: RoleCard, ctx: RecruiterContext): Promise<Judgment | null> {
  const prefix = missingDataPrefix(ctx)
  if (hasNoSignal(ctx)) {
    return { strength: 'WEAK', reasoning: `${prefix}Not enough information about this recruiter yet.`, evidence: [], model: null }
  }

  const prompt = buildUserPrompt(role, ctx)
  const api = openai() // outside the try: a missing key should stop the run, not be logged per pair
  try {
    const completion = await api.chat.completions.create({
      model: settings.OPENAI_MODEL,
      // Temperature 0 alone isn't deterministic on OpenAI; a fixed seed makes repeat runs best-effort stable
      temperature: 0,
      seed: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'match_judgment', strict: true, schema: RESPONSE_SCHEMA },
      },
    })
    const choice = completion.choices[0]
    if (!choice?.message.content) throw new Error(`empty response (finish_reason: ${choice?.finish_reason})`)

    const answer = JudgeResponse.parse(JSON.parse(choice.message.content))
    return {
      strength: answer.strength,
      reasoning: prefix + answer.reasoning,
      evidence: answer.evidence.filter((id) => prompt.evidenceIds.has(id)), // drop ids it made up
      model: completion.model,
    }
  } catch (err) {
    console.error(`judge failed (role ${role.id}, recruiter ${ctx.recruiterId}):`, err instanceof Error ? err.message : err)
    return null
  }
}

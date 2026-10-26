import { existsSync } from 'node:fs'
import { z } from 'zod'

// .env is optional; defaults match docker-compose.yml
if (existsSync('.env')) process.loadEnvFile()

const Settings = z.object({
  DB_URL: z.url().default('postgres://squad:squad@localhost:5432/squad'),
  // Recruiter payout rate when no RateAdjustment exists; matches the 9% shown in the dashboard
  DEFAULT_RATE_PERCENT: z.coerce.number().positive().default(9),
  // Only needed for real matching runs; checked when the first LLM call is made,
  // so --dry-run and `recruiter` work without it
  OPENAI_API_KEY: z.string().min(1).optional(),
  // Needs strict JSON-schema outputs and temperature 0 (gpt-5 models reject temperature)
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  // Recruiters judged in parallel per role
  MATCH_CONCURRENCY: z.coerce.number().int().positive().default(5),
})

export type Settings = z.infer<typeof Settings>

export const settings = Settings.parse(process.env)

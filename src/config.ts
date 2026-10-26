import { existsSync } from 'node:fs'
import { z } from 'zod'

// .env is optional; defaults match docker-compose.yml
if (existsSync('.env')) process.loadEnvFile()

const Settings = z.object({
  DB_URL: z.url().default('postgres://squad:squad@localhost:5432/squad'),
  // Recruiter payout rate when no RateAdjustment exists; matches the 9% shown in the dashboard
  DEFAULT_RATE_PERCENT: z.coerce.number().positive().default(9),
})

export type Settings = z.infer<typeof Settings>

export const settings = Settings.parse(process.env)

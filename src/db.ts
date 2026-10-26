import Client from 'pg-native'
import { settings } from './config.js'

export const db = new Client()
db.connectSync(settings.DB_URL)

// Use $1, $2 placeholders for values, never string interpolation.
export function query<T = Client.Row>(text: string, values?: Client.Param[]): T[] {
  return db.querySync(text, values) as T[]
}

// pg-native doesn't serialize JS arrays: pass this literal and cast with $1::text[]
export function pgArray(values: string[]): string {
  return `{${values.map((v) => `"${v.replace(/["\\]/g, '\\$&')}"`).join(',')}}`
}

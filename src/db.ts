import Client from 'pg-native'
import { settings } from './config.js'

export const db = new Client()
db.connectSync(settings.DB_URL)

// Use $1, $2 placeholders for values, never string interpolation.
export function query<T = Client.Row>(text: string, values?: Client.Param[]): T[] {
  return db.querySync(text, values) as T[]
}

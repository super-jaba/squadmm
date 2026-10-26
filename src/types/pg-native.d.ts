// Minimal typings for the synchronous API of pg-native (no published @types).
declare module 'pg-native' {
  // libpq stringifies every non-null parameter, so only pass primitives.
  type Param = string | number | boolean | null

  type Row = Record<string, unknown>

  class Client {
    constructor(config?: { arrayMode?: boolean })
    connectSync(conString?: string): void
    querySync(text: string, values?: Param[]): Row[]
    prepareSync(statementName: string, text: string, nParams: number): void
    executeSync(statementName: string, values: Param[]): Row[]
    escapeLiteral(value: string): string
    escapeIdentifier(value: string): string
    end(): void
  }

  namespace Client {
    export type { Param, Row }
  }

  export = Client
}

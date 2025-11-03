import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function getConnectionString(): string {
  // For Nuxt server, use environment variables or defaults for local dev
  const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres'
  const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres'
  const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost'
  const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432'
  const POSTGRES_DB = process.env.POSTGRES_DB || 'trading_bot'
  
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`
}

// Create a singleton connection
let client: postgres.Sql | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!client || !dbInstance) {
    const connectionString = getConnectionString()
    client = postgres(connectionString)
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

export * from './schema'

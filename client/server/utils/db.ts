import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function connectionString(env?: string): string {
  const config = useRuntimeConfig()
  const environment = env || config.nodeEnv
  
  if (environment === 'production' && config.dbConnectionString) {
    return config.dbConnectionString
  }
  return `postgresql://${config.postgresUser}:${config.postgresPassword}@${config.postgresHost}:${config.postgresPort}/${config.postgresDb}`
}

let client: postgres.Sql | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!client || !dbInstance) {
    client = postgres(connectionString())
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

export * from './schema'

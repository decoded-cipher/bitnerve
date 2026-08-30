import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { H3Event } from 'h3'
import * as schema from './schema'

export function connectionString(env?: string): string {
  const config = useRuntimeConfig()
  const environment = env || config.nodeEnv

  if (environment === 'production' && config.dbConnectionString) {
    return config.dbConnectionString
  }
  return `postgresql://${config.postgresUser}:${config.postgresPassword}@${config.postgresHost}:${config.postgresPort}/${config.postgresDb}`
}

type Db = ReturnType<typeof drizzle>

const onWorkers = () => globalThis.navigator?.userAgent === 'Cloudflare-Workers'

function describeTarget(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`
  } catch {
    return 'unparseable connection string'
  }
}

function create(url: string) {
  const client = postgres(url, { max: 1, prepare: false })
  return { client, db: drizzle(client, { schema }) }
}

let sharedDb: Db | null = null

export function getDb(event?: H3Event): Db {
  if (!onWorkers()) {
    if (!sharedDb) {
      const url = connectionString()
      console.log(`[bitnerve-db] ${describeTarget(url)}`)
      sharedDb = create(url).db
    }
    return sharedDb
  }

  if (!event) return create(connectionString()).db

  const cached = event.context.__db as Db | undefined
  if (cached) return cached

  const url = event.context.cloudflare?.env?.HYPERDRIVE?.connectionString || connectionString()
  const { client, db } = create(url)
  event.context.__db = db
  event.context.__dbClient = client
  return db
}

export * from './schema'

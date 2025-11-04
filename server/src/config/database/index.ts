import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';


export function connectionString(env?: string): string {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, DB_CONNECTION_STRING, NODE_ENV } = process.env;
  const environment = env || NODE_ENV;
  
  if (environment === 'production' && DB_CONNECTION_STRING) {
    return DB_CONNECTION_STRING;
  }
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

const client = postgres(connectionString());
export const db = drizzle(client, { schema });

export * from './schema';

export async function closeDatabase() {
  await client.end();
}

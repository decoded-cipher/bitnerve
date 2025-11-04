import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../config/database/schema';
import { connectionString } from '../config/database/index';

async function syncTable(
  localDb: ReturnType<typeof drizzle>,
  neonDb: ReturnType<typeof drizzle>,
  table: PgTable<any>,
  tableName: string
): Promise<number> {
  console.log(`Syncing ${tableName}...`);

  const localData = await localDb.select().from(table);
  console.log(`Found ${localData.length} records in local database`);

  if (localData.length === 0) {
    console.log(`No data to sync for ${tableName}`);
    return 0;
  }

  let syncedCount = 0;
  const batchSize = 100;

  for (let i = 0; i < localData.length; i += batchSize) {
    const batch = localData.slice(i, i + batchSize);

    try {
      const batchIds = batch.map((b) => b.id);
      const existingIds = await neonDb
        .select({ id: table.id })
        .from(table)
        .where(inArray(table.id, batchIds));

      const existingIdSet = new Set(existingIds.map((r) => r.id));
      const toInsert = batch.filter((r) => !existingIdSet.has(r.id));
      const toUpdate = batch.filter((r) => existingIdSet.has(r.id));

      if (toInsert.length > 0) {
        await neonDb.insert(table).values(toInsert as any);
        syncedCount += toInsert.length;
      }

      for (const record of toUpdate) {
        const { id, created_at, ...updateData } = record as any;
        await neonDb
          .update(table)
          .set(updateData)
          .where(eq(table.id, id));
        syncedCount += 1;
      }

      console.log(`Synced ${syncedCount}/${localData.length} records...`);
    } catch (error) {
      console.error(`Error syncing batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }

  console.log(`Successfully synced ${syncedCount} records to Neon\n`);
  return syncedCount;
}

async function main() {
  console.log('Starting database sync from Local DB to Neon DB...\n');
  console.log('Connecting to databases...');
  
  const localClient = postgres(connectionString('development'));
  const neonClient = postgres(connectionString('production'));

  const localDb = drizzle(localClient, { schema });
  const neonDb = drizzle(neonClient, { schema });

  try {
    await localClient`SELECT 1`;
    await neonClient`SELECT 1`;
    console.log('Connected to both databases\n');

    await syncTable(localDb, neonDb, schema.accounts, 'accounts');
    await syncTable(localDb, neonDb, schema.agentInvocations, 'agent_invocations');
    await syncTable(localDb, neonDb, schema.positions, 'positions');
    await syncTable(localDb, neonDb, schema.orders, 'orders');
    await syncTable(localDb, neonDb, schema.accountSnapshots, 'account_snapshots');

    console.log('Database sync completed successfully!');
  } catch (error) {
    console.error('\nError during sync:', error);
    process.exit(1);
  } finally {
    await localClient.end();
    await neonClient.end();
    console.log('Database connections closed');
  }
}

main();

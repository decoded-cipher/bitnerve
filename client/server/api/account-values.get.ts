import { getDb, accounts, accountSnapshots } from '~/server/utils/db'
import { eq, desc, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get all accounts
    const allAccounts = await db.select().from(accounts)
    
    if (allAccounts.length === 0) {
      return []
    }
    
    // Use account snapshots for historical data, fallback to current account_value
    const accountValues: Array<{
      timestamp: Date
      models: Record<string, number>
    }> = []
    
    // Get all snapshots ordered by timestamp
    const allSnapshots = await db
      .select()
      .from(accountSnapshots)
      .orderBy(asc(accountSnapshots.snapshot_at))
    
    // Group snapshots by account_id
    const snapshotsByAccount = new Map<string, typeof allSnapshots>()
    for (const snapshot of allSnapshots) {
      if (!snapshotsByAccount.has(snapshot.account_id)) {
        snapshotsByAccount.set(snapshot.account_id, [])
      }
      snapshotsByAccount.get(snapshot.account_id)!.push(snapshot)
    }
    
    // If we have snapshots, use them
    if (allSnapshots.length > 0) {
      // Get unique timestamps from all snapshots
      const uniqueTimestamps = Array.from(new Set(allSnapshots.map(s => s.snapshot_at.getTime())))
        .sort()
        .map(ts => new Date(ts))
      
      // Build account values array
      for (const timestamp of uniqueTimestamps) {
        const entry: { timestamp: Date; models: Record<string, number> } = {
          timestamp,
          models: {},
        }
        
        // For each account, find the closest snapshot at or before this timestamp
        for (const account of allAccounts) {
          const accountSnapshots = snapshotsByAccount.get(account.id) || []
          // Find the latest snapshot at or before this timestamp
          let closestSnapshot = accountSnapshots
            .filter(s => new Date(s.snapshot_at).getTime() <= timestamp.getTime())
            .sort((a, b) => new Date(b.snapshot_at).getTime() - new Date(a.snapshot_at).getTime())[0]
          
          if (closestSnapshot && closestSnapshot.account_value) {
            entry.models[account.id] = parseFloat(closestSnapshot.account_value)
          } else if (account.account_value) {
            // Fallback to current account_value if no snapshot
            entry.models[account.id] = parseFloat(account.account_value)
          }
        }
        
        if (Object.keys(entry.models).length > 0) {
          accountValues.push(entry)
        }
      }
    }
    
    // If no snapshots, add current account values as a single point
    if (accountValues.length === 0) {
      const currentEntry: { timestamp: Date; models: Record<string, number> } = {
        timestamp: new Date(),
        models: {},
      }
      
      for (const account of allAccounts) {
        // Use stored account_value, or calculate from current_balance if not stored
        if (account.account_value) {
          currentEntry.models[account.id] = parseFloat(account.account_value)
        } else {
          // Fallback: use current_balance (shouldn't happen if metrics are updated)
          currentEntry.models[account.id] = parseFloat(account.current_balance)
        }
      }
      
      if (Object.keys(currentEntry.models).length > 0) {
        accountValues.push(currentEntry)
      }
    }
    
    return accountValues
  } catch (error) {
    console.error('Error fetching account values:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch account values'
    })
  }
})

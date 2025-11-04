import { getDb, accounts, accountSnapshots, orders, positions } from '~/server/utils/db'
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
    
    // If we have snapshots, use them for accurate historical data
    if (allSnapshots.length > 0) {
      // Group snapshots by timestamp to ensure we get all accounts at each point
      const snapshotsByTimestamp = new Map<number, typeof allSnapshots>()
      
      for (const snapshot of allSnapshots) {
        const timestamp = new Date(snapshot.snapshot_at).getTime()
        if (!snapshotsByTimestamp.has(timestamp)) {
          snapshotsByTimestamp.set(timestamp, [])
        }
        snapshotsByTimestamp.get(timestamp)!.push(snapshot)
      }
      
      // Get unique timestamps and sort them
      const uniqueTimestamps = Array.from(snapshotsByTimestamp.keys()).sort()
      
      // Build account values array from snapshots
      for (const timestampMs of uniqueTimestamps) {
        const timestamp = new Date(timestampMs)
        const snapshotsAtTime = snapshotsByTimestamp.get(timestampMs) || []
        
        const entry: { timestamp: Date; models: Record<string, number> } = {
          timestamp,
          models: {},
        }
        
        // For each account, find its snapshot at this exact timestamp
        for (const account of allAccounts) {
          const snapshot = snapshotsAtTime.find(s => s.account_id === account.id)
          
          if (snapshot && snapshot.account_value) {
            entry.models[account.id] = parseFloat(snapshot.account_value)
          } else {
            // Find the latest snapshot before this timestamp
            const accountSnapshots = snapshotsByAccount.get(account.id) || []
            const closestSnapshot = accountSnapshots
              .filter(s => new Date(s.snapshot_at).getTime() <= timestampMs)
              .sort((a, b) => new Date(b.snapshot_at).getTime() - new Date(a.snapshot_at).getTime())[0]
            
            if (closestSnapshot && closestSnapshot.account_value) {
              entry.models[account.id] = parseFloat(closestSnapshot.account_value)
            } else if (account.account_value) {
              // Fallback to current account_value if no snapshot found
              entry.models[account.id] = parseFloat(account.account_value)
            }
          }
        }
        
        if (Object.keys(entry.models).length > 0) {
          accountValues.push(entry)
        }
      }
      
      // Add current value as the latest point if not already included
      const latestTimestamp = uniqueTimestamps.length > 0 ? uniqueTimestamps[uniqueTimestamps.length - 1] : null
      const currentTime = Date.now()
      if (!latestTimestamp || (currentTime - latestTimestamp) > 60000) { // More than 1 minute difference
        const currentEntry: { timestamp: Date; models: Record<string, number> } = {
          timestamp: new Date(),
          models: {},
        }
        
        for (const account of allAccounts) {
          if (account.account_value) {
            currentEntry.models[account.id] = parseFloat(account.account_value)
          } else {
            // Fallback: use current_balance
            currentEntry.models[account.id] = parseFloat(account.current_balance)
          }
        }
        
        if (Object.keys(currentEntry.models).length > 0) {
          accountValues.push(currentEntry)
        }
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

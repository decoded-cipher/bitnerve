import { getDb, accounts, orders } from '~/server/utils/db'
import { eq, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get all accounts
    const allAccounts = await db.select().from(accounts)
    
    if (allAccounts.length === 0) {
      return []
    }
    
    // For each account, try to reconstruct some history from orders
    // If we don't have enough history, generate some points based on current state
    const accountValues: Array<{
      timestamp: Date
      models: Record<string, number>
    }> = []
    
    // Get the earliest and latest order timestamps across all accounts
    const earliestOrder = await db
      .select({
        created_at: orders.created_at,
      })
      .from(orders)
      .orderBy(orders.created_at)
      .limit(1)
    
    const latestOrder = await db
      .select({
        created_at: orders.created_at,
      })
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(1)
    
    const startTime = earliestOrder.length > 0 
      ? new Date(earliestOrder[0].created_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const endTime = latestOrder.length > 0
      ? new Date(latestOrder[0].created_at)
      : new Date()
    
    // Generate timestamps (daily points over the time range, max 200 points)
    const timeRange = endTime.getTime() - startTime.getTime()
    const numPoints = Math.min(200, Math.max(30, Math.floor(timeRange / (24 * 60 * 60 * 1000))))
    const interval = timeRange / numPoints
    
    // For each account, calculate values over time
    // This is a simplified approach - ideally we'd have account balance snapshots
    for (const account of allAccounts) {
      const initialBalance = parseFloat(account.initial_balance)
      const currentBalance = parseFloat(account.current_balance)
      const totalPnl = parseFloat(account.total_pnl)
      
      // Get orders for this account to reconstruct some history
      const accountOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.account_id, account.id))
        .orderBy(orders.created_at)
      
      // Calculate balance progression
      // This is simplified - we're estimating based on order timestamps and PnL
      let runningBalance = initialBalance
      let orderIndex = 0
      
      for (let i = 0; i < numPoints; i++) {
        const timestamp = new Date(startTime.getTime() + i * interval)
        
        // Check if we have a value for this timestamp
        if (!accountValues[i]) {
          accountValues[i] = {
            timestamp,
            models: {},
          }
        }
        
        // Process orders up to this timestamp
        while (
          orderIndex < accountOrders.length &&
          new Date(accountOrders[orderIndex].created_at) <= timestamp
        ) {
          const order = accountOrders[orderIndex]
          if (order.realized_pnl) {
            runningBalance += parseFloat(order.realized_pnl)
          }
          orderIndex++
        }
        
        // Estimate balance at this point
        // Interpolate between initial and current balance based on progress
        const progress = i / (numPoints - 1)
        const estimatedBalance = initialBalance + (totalPnl * progress)
        
        accountValues[i].models[account.id] = estimatedBalance
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

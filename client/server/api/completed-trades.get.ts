import { getDb, orders, accounts, positions } from '~/server/utils/db'
import { eq, and, desc, sql } from 'drizzle-orm'

// Model name mapping - same as in accounts.get.ts
function getModelName(accountId: string): string {
  // For now, since there's only one account, return the known model name
  // This can be enhanced to check agent_invocations or use a mapping table
  return 'google/gemini-2.0-flash-001'
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get all closed orders (FILLED status) that closed positions
    // A completed trade is when an order closes a position (has position_id and realized_pnl)
    const closedOrders = await db
      .select({
        order: orders,
        account: accounts,
        position: positions,
      })
      .from(orders)
      .innerJoin(accounts, eq(orders.account_id, accounts.id))
      .leftJoin(positions, eq(orders.position_id, positions.id))
      .where(
        and(
          eq(orders.status, 'FILLED'),
          // Only include orders that closed positions (have position_id)
          // These represent completed trades
          sql`${orders.position_id} IS NOT NULL`
        )
      )
      .orderBy(desc(orders.created_at))
      .limit(100)
    
    // Group by account and format the data
    const tradesByAccount = new Map()
    
    for (const { order, account, position } of closedOrders) {
      if (!order.filled_price || !order.realized_pnl) continue
      
      const accountId = account.id
      if (!tradesByAccount.has(accountId)) {
        tradesByAccount.set(accountId, {
          account_id: accountId,
          model_name: getModelName(accountId),
          trades: [],
        })
      }
      
      const accountData = tradesByAccount.get(accountId)
      const modelName = getModelName(accountId)
      
      // Calculate entry price from position or use order price
      const entryPrice = position ? parseFloat(position.entry_price) : parseFloat(order.price || '0')
      const exitPrice = parseFloat(order.filled_price)
      const quantity = parseFloat(order.quantity)
      const notionalEntry = entryPrice * quantity
      const notionalExit = exitPrice * quantity
      const realizedPnl = parseFloat(order.realized_pnl)
      
      // Determine trade type and holding time
      const tradeType = position ? (position.side === 'LONG' ? 'long trade' : 'short trade') : 'trade'
      const holdingTime = position 
        ? Math.round((new Date(order.created_at).getTime() - new Date(position.created_at).getTime()) / (1000 * 60)) // minutes
        : 0
      
      // Format holding time
      let holdingTimeFormatted = ''
      if (holdingTime < 60) {
        holdingTimeFormatted = `${holdingTime}m`
      } else if (holdingTime < 1440) {
        holdingTimeFormatted = `${Math.floor(holdingTime / 60)}h ${holdingTime % 60}m`
      } else {
        const days = Math.floor(holdingTime / 1440)
        const hours = Math.floor((holdingTime % 1440) / 60)
        holdingTimeFormatted = `${days}d ${hours}h`
      }
      
      accountData.trades.push({
        id: order.id,
        model_name: modelName,
        trade_type: tradeType,
        coin: order.symbol.replace('USDT', ''),
        completed_at: order.created_at,
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity: quantity,
        notional_entry: notionalEntry,
        notional_exit: notionalExit,
        holding_time: holdingTimeFormatted || '0m',
        net_pnl: realizedPnl,
      })
    }
    
    // Flatten to array of trades
    const allTrades = Array.from(tradesByAccount.values()).flatMap(account => account.trades)
    
    // Sort by completed_at descending
    allTrades.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    
    return allTrades.slice(0, 100) // Return last 100 trades
  } catch (error) {
    console.error('Error fetching completed trades:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch completed trades'
    })
  }
})


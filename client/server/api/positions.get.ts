import { getDb, positions, accounts } from '~/server/utils/db'
import { eq, and } from 'drizzle-orm'

// Model name mapping - same as in accounts.get.ts
function getModelName(accountId: string): string {
  return 'google/gemini-2.0-flash-001'
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get all open positions with their accounts
    const allPositions = await db
      .select({
        position: positions,
        account: accounts,
      })
      .from(positions)
      .innerJoin(accounts, eq(positions.account_id, accounts.id))
      .where(eq(positions.is_open, true))
      .orderBy(positions.created_at)
    
    // Group positions by account
    const positionsByAccount = new Map()
    
    for (const { position, account } of allPositions) {
      if (!positionsByAccount.has(account.id)) {
        positionsByAccount.set(account.id, {
          account_id: account.id,
          account: {
            id: account.id,
            initial_balance: parseFloat(account.initial_balance),
            current_balance: parseFloat(account.current_balance),
            total_pnl: parseFloat(account.total_pnl),
          },
          positions: [],
          total_unrealized_pnl: 0,
          available_cash: parseFloat(account.current_balance),
        })
      }
      
      const accountData = positionsByAccount.get(account.id)
      const sideDisplay = position.side === 'BUY' ? 'LONG' : position.side === 'SELL' ? 'SHORT' : position.side

      const positionData = {
        id: position.id,
        symbol: position.symbol,
        side: sideDisplay as 'LONG' | 'SHORT',
        quantity: parseFloat(position.quantity),
        entry_price: parseFloat(position.entry_price),
        current_price: parseFloat(position.current_price),
        unrealized_pnl: parseFloat(position.unrealized_pnl),
        leverage: position.leverage,
        is_open: position.is_open,
      }
      
      accountData.positions.push(positionData)
      accountData.total_unrealized_pnl += positionData.unrealized_pnl
      
      // Calculate notional value (quantity * current_price)
      const notional = Math.abs(positionData.quantity * positionData.current_price)
      // Rough estimate of available cash (current balance minus margin used)
      // Margin = notional / leverage
      const marginUsed = notional / positionData.leverage
      accountData.available_cash -= marginUsed
    }
    
    return Array.from(positionsByAccount.values())
  } catch (error) {
    console.error('Error fetching positions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch positions'
    })
  }
})

import { getDb, positions, accounts } from '~/server/utils/db'
import { eq } from 'drizzle-orm'

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
        const netExposure = account.crypto_value
          ? parseFloat(account.crypto_value)
          : 0

        positionsByAccount.set(account.id, {
          account_id: account.id,
          account: {
            id: account.id,
            provider: account.provider,
            model_name: account.model_name,
            initial_balance: parseFloat(account.initial_balance),
            current_balance: parseFloat(account.current_balance),
            total_pnl: parseFloat(account.total_pnl),
            account_value: account.account_value ? parseFloat(account.account_value) : parseFloat(account.current_balance),
            crypto_value: netExposure,
            total_return_percent: account.total_return_percent ? parseFloat(account.total_return_percent) : null,
            sharpe_ratio: account.sharpe_ratio ? parseFloat(account.sharpe_ratio) : null,
          },
          positions: [],
          total_unrealized_pnl: 0,
          available_cash: parseFloat(account.current_balance),
          net_exposure: netExposure,
        })
      }

      const accountData = positionsByAccount.get(account.id)
      const sideDisplay = position.side === 'BUY' ? 'LONG' : position.side === 'SELL' ? 'SHORT' : position.side

      const unrealizedPnl = parseFloat(position.unrealized_pnl ?? '0') || 0

      const positionData = {
        id: position.id,
        symbol: position.symbol.replace(/USDT$/, ''),
        side: sideDisplay as 'LONG' | 'SHORT',
        quantity: parseFloat(position.quantity),
        entry_price: parseFloat(position.entry_price),
        current_price: parseFloat(position.current_price),
        unrealized_pnl: unrealizedPnl,
        leverage: position.leverage,
        is_open: position.is_open,
      }

      accountData.positions.push(positionData)
      accountData.total_unrealized_pnl += unrealizedPnl
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

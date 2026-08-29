import { getDb, accounts } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    const allAccounts = await db.select().from(accounts).orderBy(accounts.created_at)
    
    // Use stored metrics from the database
    return allAccounts.map(account => ({
      id: account.id,
      provider: account.provider,
      model_name: account.model_name,
      initial_balance: parseFloat(account.initial_balance),
      current_balance: parseFloat(account.current_balance),
      total_pnl: parseFloat(account.total_pnl),
      // Use stored calculated metrics
      account_value: account.account_value ? parseFloat(account.account_value) : parseFloat(account.current_balance),
      crypto_value: account.crypto_value ? parseFloat(account.crypto_value) : 0,
      total_return_percent: account.total_return_percent ? parseFloat(account.total_return_percent) : 0,
      sharpe_ratio: account.sharpe_ratio ? parseFloat(account.sharpe_ratio) : null,
      created_at: account.created_at,
      updated_at: account.updated_at,
    }))
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch accounts'
    })
  }
})

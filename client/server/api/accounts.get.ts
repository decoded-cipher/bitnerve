import { getDb, accounts } from '~/server/utils/db'
import { eq } from 'drizzle-orm'

// Model name mapping - can be extended when more accounts/models are added
// In the future, this can be replaced with a model_name field in the accounts table
function getModelName(accountId: string): string {
  // For now, since there's only one account, return the known model name
  // This can be enhanced to check agent_invocations or use a mapping table
  // TODO: Add model_name field to accounts table or create a mapping table
  return 'google/gemini-2.0-flash-001'
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    const allAccounts = await db.select().from(accounts).orderBy(accounts.created_at)
    
    // Convert numeric values to numbers and add model_name
    return allAccounts.map(account => ({
      id: account.id,
      model_name: getModelName(account.id),
      initial_balance: parseFloat(account.initial_balance),
      current_balance: parseFloat(account.current_balance),
      total_pnl: parseFloat(account.total_pnl),
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

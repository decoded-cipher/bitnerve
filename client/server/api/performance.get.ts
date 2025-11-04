import { getDb, accounts } from '~/server/utils/db'

// Model name mapping - same as in accounts.get.ts
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
    
    // Get all accounts
    const allAccounts = await db
      .select()
      .from(accounts)
    
    if (allAccounts.length === 0) {
      return {
        highest: null,
        lowest: null,
      }
    }
    
    // Process accounts: use stored values, calculate if missing
    const accountsWithMetrics = allAccounts.map(account => {
      const initial = parseFloat(account.initial_balance)
      // Use stored account_value if available, otherwise use current_balance
      const accountValue = account.account_value 
        ? parseFloat(account.account_value) 
        : parseFloat(account.current_balance)
      // Use stored total_return_percent if available, otherwise calculate
      const change = account.total_return_percent !== null && account.total_return_percent !== undefined
        ? parseFloat(account.total_return_percent)
        : (initial > 0 ? ((accountValue - initial) / initial) * 100 : 0)
      
      return {
        id: account.id,
        account_value: accountValue,
        change,
      }
    })
    
    // Sort by account_value (total value) - highest first
    accountsWithMetrics.sort((a, b) => b.account_value - a.account_value)
    
    // Get highest (first in descending order)
    const highest = accountsWithMetrics[0]
    
    // Get lowest (last in array)
    const lowest = accountsWithMetrics[accountsWithMetrics.length - 1]
    
    return {
      highest: {
        model: getModelName(highest.id).toUpperCase(),
        value: highest.account_value,
        change: highest.change,
        icon: 'gemini'
      },
      lowest: {
        model: getModelName(lowest.id).toUpperCase(),
        value: lowest.account_value,
        change: lowest.change,
        icon: 'gemini'
      },
    }
  } catch (error) {
    console.error('Error fetching performance:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch performance data'
    })
  }
})

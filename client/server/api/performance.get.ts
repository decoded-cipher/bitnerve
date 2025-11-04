import { getDb, accounts } from '~/server/utils/db'
import { desc, asc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get all accounts ordered by current balance (performance)
    const allAccounts = await db
      .select()
      .from(accounts)
      .orderBy(desc(accounts.current_balance))
    
    if (allAccounts.length === 0) {
      return {
        highest: null,
        lowest: null,
      }
    }
    
    // Use stored account_value and total_return_percent instead of calculating
    const accountsWithChange = allAccounts.map(account => {
      const initial = parseFloat(account.initial_balance)
      // Use stored account_value if available, otherwise use current_balance
      const accountValue = account.account_value 
        ? parseFloat(account.account_value) 
        : parseFloat(account.current_balance)
      // Use stored total_return_percent if available, otherwise calculate
      const change = account.total_return_percent 
        ? parseFloat(account.total_return_percent)
        : (initial > 0 ? ((accountValue - initial) / initial) * 100 : 0)
      
      return {
        id: account.id,
        account_value: accountValue,
        current_balance: parseFloat(account.current_balance),
        initial_balance: initial,
        change,
      }
    })
    
    // Sort by account_value (total value) instead of just current_balance
    accountsWithChange.sort((a, b) => b.account_value - a.account_value)
    
    // Get highest (first in descending order)
    const highest = accountsWithChange[0]
    
    // Get lowest (last in array)
    const lowest = accountsWithChange[accountsWithChange.length - 1]
    
    // For now, we'll use account IDs as model names
    // You might want to add a model_name field to accounts table later
    const modelNameMap: Record<string, string> = {
      // This can be enhanced to map account IDs to model names
      // For now, we'll use generic names
    }
    
    return {
      highest: {
        model: modelNameMap[highest.id] || `Account ${highest.id.slice(0, 8)}`,
        value: highest.account_value, // Use total account value instead of just balance
        change: highest.change,
        icon: 'purple', // Default icon
      },
      lowest: {
        model: modelNameMap[lowest.id] || `Account ${lowest.id.slice(0, 8)}`,
        value: lowest.account_value, // Use total account value instead of just balance
        change: lowest.change,
        icon: 'green', // Default icon
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

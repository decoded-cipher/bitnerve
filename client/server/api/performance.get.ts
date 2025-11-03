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
    
    // Calculate percentage change from initial balance
    const accountsWithChange = allAccounts.map(account => {
      const initial = parseFloat(account.initial_balance)
      const current = parseFloat(account.current_balance)
      const change = initial > 0 ? ((current - initial) / initial) * 100 : 0
      
      return {
        id: account.id,
        current_balance: current,
        initial_balance: initial,
        change,
      }
    })
    
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
        value: highest.current_balance,
        change: highest.change,
        icon: 'purple', // Default icon
      },
      lowest: {
        model: modelNameMap[lowest.id] || `Account ${lowest.id.slice(0, 8)}`,
        value: lowest.current_balance,
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

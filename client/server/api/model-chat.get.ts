import { getDb, agentInvocations, accounts } from '~/server/utils/db'
import { eq, desc, count } from 'drizzle-orm'

// Model name mapping - same as in accounts.get.ts
function getModelName(accountId: string): string {
  // For now, since there's only one account, return the known model name
  // This can be enhanced to check agent_invocations or use a mapping table
  return 'google/gemini-2.0-flash-001'
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDb()
    
    // Get pagination parameters from query
    const query = getQuery(event)
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 20))
    const offset = (page - 1) * limit
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: count(agentInvocations.id) })
      .from(agentInvocations)
      .innerJoin(accounts, eq(agentInvocations.account_id, accounts.id))
    
    const total = Number(totalResult[0]?.count || 0)
    const totalPages = Math.ceil(total / limit)
    
    // Get paginated agent invocations with their accounts, ordered by most recent
    const invocations = await db
      .select({
        invocation: agentInvocations,
        account: accounts,
      })
      .from(agentInvocations)
      .innerJoin(accounts, eq(agentInvocations.account_id, accounts.id))
      .orderBy(desc(agentInvocations.created_at))
      .limit(limit)
      .offset(offset)
    
    // Format the messages with full details
    const messages = invocations.map(({ invocation, account }) => {
      // Extract model name and format it
      const modelName = getModelName(account.id)
      const formattedName = modelName
        .replace(/\//g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .toUpperCase()
      
      // Get the chain of thought text (the agent's response)
      const messageText = invocation.chain_of_thought || 'No response available'
      
      // Format timestamp
      const timestamp = new Date(invocation.created_at)
      const month = String(timestamp.getMonth() + 1).padStart(2, '0')
      const day = String(timestamp.getDate()).padStart(2, '0')
      const hours = String(timestamp.getHours()).padStart(2, '0')
      const minutes = String(timestamp.getMinutes()).padStart(2, '0')
      const seconds = String(timestamp.getSeconds()).padStart(2, '0')
      const formattedTimestamp = `${month}/${day} ${hours}:${minutes}:${seconds}`
      
      return {
        id: invocation.id,
        account_id: account.id,
        model_name: formattedName,
        message: messageText,
        timestamp: formattedTimestamp,
        created_at: invocation.created_at,
        // Include full agent invocation details
        user_prompt: invocation.user_prompt || '',
        chain_of_thought: invocation.chain_of_thought || '',
        agent_response: invocation.agent_response || null,
      }
    })
    
    // Return paginated response
    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  } catch (error) {
    console.error('Error fetching model chat:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch model chat'
    })
  }
})


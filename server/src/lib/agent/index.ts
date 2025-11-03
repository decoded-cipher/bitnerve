
import { z } from 'zod';
import { generateText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { getMarketData } from '../exchange';
import type { SessionState } from '../../types';
import { getUserPrompt } from './renderer';
import { PROMPT } from './prompt';
import { createPosition, closePosition } from '../exchange/helper';
import { TRADING_SYMBOLS } from '../../config/exchange';
import { db, agentInvocations } from '../../config/database';
import { eq } from 'drizzle-orm';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});




export async function invokeAgent(
  sessionState: SessionState,
  accountId: string
): Promise<{
  text: string;
  toolCalls?: Array<{ toolName: string; args: any; result: any }>;
  finishReason: 'stop' | 'tool_calls' | 'length';
}> {

  // Fetch prompt and raw data for saving
  const { prompt: userPrompt, marketData, metrics } = await getUserPrompt(sessionState, accountId);

  // Create agent invocation record FIRST to get the invocation ID
  let invocationId: string;
  try {
    const [invocation] = await db.insert(agentInvocations).values({
      account_id: accountId,
      session_state: sessionState as any,
      market_data: marketData as any,
      metrics: metrics as any,
      user_prompt: userPrompt,
      chain_of_thought: '', // Will be updated after LLM completes
      agent_response: null, // Will be updated after LLM completes
      finish_reason: null, // Will be updated after LLM completes
    }).returning();
    
    invocationId = invocation.id;
  } catch (error) {
    console.error('Error creating agent invocation record:', error);
    throw error; // Fail if we can't create the record
  }

  // Generate text with tools
  const { text, toolCalls, finishReason } = await generateText({
    model: openrouter(process.env.OPENROUTER_MODEL!),
    system: PROMPT.SYSTEM,
    prompt: userPrompt,
    tools: {
      createPosition: tool({
        description: `Open a new BUY (long) or SELL (short) position for a cryptocurrency perpetual futures contract. Use this when you identify a strong entry signal based on technical analysis. Supported symbols: ${TRADING_SYMBOLS.join(', ')}. Analyze all available symbols and trade the one with the best opportunity. Use reasonable position sizes - quantities should be in the range of 0.01 to 10 units depending on the symbol and your available cash and risk tolerance.`,
        inputSchema: z.object({
          symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]).describe(`The trading symbol. Supported symbols: ${TRADING_SYMBOLS.join(', ')}. Choose based on which symbol presents the best trading opportunity.`),
          side: z.enum(['BUY', 'SELL']).describe('BUY for long positions (profit when price increases), SELL for short positions (profit when price decreases)'),
          quantity: z.number().describe('The quantity to trade. Use reasonable sizes based on available cash, risk management, and the symbol being traded (e.g., 0.1 BTC for BTCUSDT, 1 ETH for ETHUSDT, 10 SOL for SOLUSDT).'),
        }),
        execute: async ({ symbol, side, quantity }) => {
          const marketData = await getMarketData(symbol);
          const position = await createPosition(accountId, symbol, side, quantity, marketData.currentPrice, invocationId);
          
          console.log(`Opened position: ${side} ${quantity} ${symbol} at $${marketData.currentPrice}`);
          return position;
        },
      }),
      closePosition: tool({
        description: 'Close an existing position partially or fully when profit targets are reached, stop-loss triggers, or trend reverses. If you do not specify quantity, the entire position will be closed.',
        inputSchema: z.object({
          symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]).describe(`The trading symbol of the position to close. Supported symbols: ${TRADING_SYMBOLS.join(', ')}.`),
          quantity: z.number().optional().describe('The quantity to close in units. If not provided or set to undefined, the entire position will be closed. Use partial closes to take profits while letting winners run.'),
        }),
        execute: async ({ symbol, quantity }) => {
          const result = await closePosition(accountId, symbol, quantity, invocationId);
          
          console.log(`Closed position: ${symbol} at $${result.order.filled_price}`);
          return result;
        },
      }),
    }
  });

  // Execute any tool calls (if needed - tools are auto-executed in v5)
  const executedToolCalls = [];
  if (toolCalls && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      if ('args' in toolCall && 'result' in toolCall) {
        executedToolCalls.push({
          toolName: toolCall.toolName,
          args: toolCall.args,
          result: toolCall.result,
        });
      }
    }
  }

  // Update agent invocation data with LLM response
  try {
    await db.update(agentInvocations)
      .set({
        chain_of_thought: text,
        agent_response: executedToolCalls.length > 0 ? executedToolCalls : null,
        finish_reason: finishReason as string,
      })
      .where(eq(agentInvocations.id, invocationId));
  } catch (error) {
    console.error('Error updating agent invocation in database:', error);
    // Don't throw - allow the function to continue even if updating fails
  }

  return {
    text,
    toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
    finishReason: finishReason as 'stop' | 'tool_calls' | 'length',
  };
}

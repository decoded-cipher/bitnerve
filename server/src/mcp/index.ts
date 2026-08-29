import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import { TRADING_SYMBOLS } from '../config/exchange';
import { closeDatabase } from '../config/database';
import { createPosition, closePosition } from '../lib/exchange/helper';
import { round } from '../lib/utils';
import { getInstrument, roundQuantity, describeConstraints } from '../lib/exchange/instruments';
import { describeError } from '../lib/errors';
import { snapshot } from './market';
import { getAccountId, currentInvocationId, recordAnalysis, appendToolCall } from './session';

const log = (...args: unknown[]) => console.error('[bitnerve-mcp]', ...args);

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] });

async function record<T>(
  toolName: string,
  input: unknown,
  run: () => Promise<{ payload: T; body: string }>
) {
  try {
    const { payload, body } = await run();
    await appendToolCall({ toolName, input, result: payload, error: null });
    return text(body);
  } catch (error) {
    const { message } = describeError(error);
    await appendToolCall({ toolName, input, result: null, error: message });
    log(`${toolName} rejected:`, message);
    return text(`REJECTED: ${message}`);
  }
}

const server = new McpServer({ name: 'bitnerve', version: '2.0.0' });

server.registerTool(
  'create_position',
  {
    title: 'Open position',
    description:
      'Open a BUY (long) or SELL (short) perpetual futures position at the current mark. Quantity must meet the exchange minimum and is snapped down to its step size; leverage is capped at the exchange maximum for that symbol. Margin is deducted as notional / leverage and the call is rejected if free cash cannot cover it. One position per symbol.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
      side: z.enum(['BUY', 'SELL']),
      quantity: z.number().positive(),
      leverage: z.number().int().min(1).optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ symbol, side, quantity, leverage }) =>
    record('create_position', { symbol, side, quantity, leverage }, async () => {
      const accountId = await getAccountId();
      const instrument = await getInstrument(symbol);

      const placeable = roundQuantity(quantity, instrument);
      if (placeable < instrument.minQuantity || placeable <= 0) {
        throw new Error(
          `Quantity ${quantity} is below the exchange minimum for ${symbol} (${instrument.minQuantity}). ${describeConstraints(instrument)}`
        );
      }
      if (instrument.maxQuantity && placeable > instrument.maxQuantity) {
        throw new Error(
          `Quantity ${placeable} exceeds the exchange maximum for ${symbol} (${instrument.maxQuantity}).`
        );
      }

      const requested = leverage ?? 1;
      const lev = Math.min(Math.max(requested, instrument.minLeverage), instrument.maxLeverage);

      const invocation = await currentInvocationId();
      const data = await snapshot(symbol);
      const result = await createPosition(
        accountId,
        symbol,
        side,
        placeable,
        data.currentPrice,
        invocation,
        lev
      );

      const filledLev = result.position.leverage;
      const notional = data.currentPrice * placeable;
      const notes: string[] = [];
      if (placeable !== quantity) notes.push(`quantity snapped ${quantity} -> ${placeable} (step ${instrument.quantityStep})`);
      if (lev !== requested) notes.push(`leverage clamped ${requested}x -> ${lev}x (max ${instrument.maxLeverage}x)`);

      return {
        payload: result,
        body: [
          `FILLED ${side} ${placeable} ${symbol} @ ${round(data.currentPrice, 4)}`,
          `leverage ${filledLev}x  notional ${round(notional, 2)}  margin ${round(notional / filledLev, 2)}`,
          ...notes,
          `position ${result.position.id}`,
        ].join('\n'),
      };
    })
);

server.registerTool(
  'close_position',
  {
    title: 'Close position',
    description:
      'Close an open position fully, or partially by passing quantity. Releases the proportional margin and realises PnL at the current mark.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
      quantity: z.number().positive().optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ symbol, quantity }) =>
    record('close_position', { symbol, quantity }, async () => {
      const accountId = await getAccountId();
      const invocationId = await currentInvocationId();
      const data = await snapshot(symbol);
      const result = await closePosition(
        accountId,
        symbol,
        data.currentPrice,
        quantity,
        invocationId
      );

      return {
        payload: result,
        body: [
          `CLOSED ${round(result.closedQuantity, 6)} ${symbol} @ ${round(parseFloat(result.order.filled_price ?? '0'), 4)}`,
          `realised pnl ${round(result.realizedPnL, 2)}`,
        ].join('\n'),
      };
    })
);

server.registerTool(
  'record_analysis',
  {
    title: 'Record analysis',
    description:
      'Persist your reasoning for this cycle so it appears in the dashboard. Call this once at the end of every cycle, including when you decide to stay flat.',
    inputSchema: z.object({
      reasoning: z.string().min(1),
      action: z.enum(['opened', 'closed', 'adjusted', 'flat']),
    }),
  },
  async ({ reasoning, action }) =>
    record('record_analysis', { action }, async () => {
      await recordAnalysis(reasoning, action === 'flat' ? 'stop' : 'tool-calls');
      return { payload: { action }, body: `Recorded (${action}).` };
    })
);

async function shutdown() {
  await closeDatabase().catch(error => log('database close failed:', error));
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

await server.connect(new StdioServerTransport());
log('ready on stdio');

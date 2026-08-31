import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import { TRADING_SYMBOLS } from '../config/exchange';
import { closeDatabase } from '../config/database';
import { createPosition, closePosition, addToPosition, setStop, buildExitLadder } from '../lib/exchange/helper';
import { round, sig } from '../lib/utils';
import { getInstrument, roundQuantity, describeConstraints } from '../lib/exchange/instruments';
import { describeError } from '../lib/errors';
import { addLesson, retireLesson } from '../lib/lessons';
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
      'Open a BUY (long) or SELL (short) perpetual futures position at the current mark. Quantity must meet the exchange minimum and is snapped down to its step size; leverage is capped at the exchange maximum for that symbol. Margin is deducted as notional / leverage, plus a taker fee on the notional, and the call is rejected if free cash cannot cover both. One position per symbol. Pass stop_price to arm a protective stop that is enforced between cycles: it closes the position automatically at the stop, or at the open of the bar that gapped through it.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
      side: z.enum(['BUY', 'SELL']),
      quantity: z.number().positive(),
      leverage: z.number().int().min(1).optional(),
      stop_price: z.number().positive().optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ symbol, side, quantity, leverage, stop_price }) =>
    record('create_position', { symbol, side, quantity, leverage, stop_price }, async () => {
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
        lev,
        stop_price
      );

      const filledLev = result.position.leverage;
      const notional = data.currentPrice * placeable;
      const notes: string[] = [];
      if (placeable !== quantity) notes.push(`quantity snapped ${quantity} -> ${placeable} (step ${instrument.quantityStep})`);
      if (lev !== requested) notes.push(`leverage clamped ${requested}x -> ${lev}x (max ${instrument.maxLeverage}x)`);
      if (stop_price !== undefined) {
        const risk = Math.abs(data.currentPrice - stop_price) * placeable;
        const atr3 = data.midTerm.atr3[data.midTerm.atr3.length - 1] ?? 0;
        await buildExitLadder(
          accountId,
          result.position.id,
          side,
          data.currentPrice,
          stop_price,
          placeable,
          atr3,
          instrument.quantityStep
        );
        const r = Math.abs(data.currentPrice - stop_price);
        const dir = side === 'BUY' ? 1 : -1;
        notes.push(
          `stop armed at ${sig(stop_price)} — risking ${round(risk, 2)} (1R) if hit`,
          `ladder armed: +1R close ${round(Math.floor(placeable / 3 / (instrument.quantityStep || 1)) * (instrument.quantityStep || 1), 6)} at ${sig(data.currentPrice + dir * r)}  |  +1.5R stop -> break-even at ${sig(data.currentPrice + dir * r * 1.5)}  |  +2R trail ${sig(atr3)} from ${sig(data.currentPrice + dir * r * 2)}`,
          'the watcher fires these between cycles; override any leg with adjust_position'
        );
      } else {
        notes.push('NO STOP ARMED — nothing will close this position between cycles');
      }

      return {
        payload: result,
        body: [
          `FILLED ${side} ${placeable} ${symbol} @ ${sig(data.currentPrice)}`,
          `leverage ${filledLev}x  notional ${round(notional, 2)}  margin ${round(notional / filledLev, 2)}  taker fee ${round(result.entryFee, 2)}`,
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
      'Close an open position fully, or partially by passing quantity. Releases the proportional margin and realises PnL at the current mark, net of the taker fee on both the entry and the exit.',
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
          `gross ${round(result.grossPnL, 2)}  fees ${round(result.fees, 2)}  net realised ${round(result.realizedPnL, 2)}`,
        ].join('\n'),
      };
    })
);

server.registerTool(
  'adjust_position',
  {
    title: 'Adjust position',
    description:
      'Change an open position without closing it. Pass add_quantity to scale in at the current mark — margin and a taker fee are charged on the added notional only, and the entry price is re-averaged, so adding is far cheaper than a close-and-reopen round trip. Pass stop_price to set or move the protective stop, which is how you take a proven winner to break-even. At least one of the two is required; both may be given together. Use close_position to reduce size.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
      add_quantity: z.number().positive().optional(),
      stop_price: z.number().positive().optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ symbol, add_quantity, stop_price }) =>
    record('adjust_position', { symbol, add_quantity, stop_price }, async () => {
      if (add_quantity === undefined && stop_price === undefined) {
        throw new Error('Pass add_quantity, stop_price, or both — adjust_position with neither does nothing.');
      }

      const accountId = await getAccountId();
      const invocation = await currentInvocationId();
      const data = await snapshot(symbol);
      const lines: string[] = [];
      let payload: Record<string, unknown> = {};

      if (add_quantity !== undefined) {
        const instrument = await getInstrument(symbol);
        const placeable = roundQuantity(add_quantity, instrument);
        if (placeable <= 0) {
          throw new Error(
            `Added quantity ${add_quantity} rounds to zero at the step size for ${symbol}. ${describeConstraints(instrument)}`
          );
        }
        const added = await addToPosition(accountId, symbol, placeable, data.currentPrice, invocation);
        payload = { ...payload, added };
        if (placeable !== add_quantity) {
          lines.push(`quantity snapped ${add_quantity} -> ${placeable} (step ${instrument.quantityStep})`);
        }
        lines.push(
          `ADDED ${placeable} ${symbol} @ ${sig(data.currentPrice)}`,
          `quantity ${round(added.newQuantity - placeable, 6)} -> ${round(added.newQuantity, 6)}  entry ${sig(added.previousEntry)} -> ${sig(added.newEntry)}`,
          `margin ${round(added.marginUsed, 2)}  taker fee ${round(added.entryFee, 2)}`
        );
      }

      if (stop_price !== undefined) {
        const moved = await setStop(accountId, symbol, stop_price, data.currentPrice);
        payload = { ...payload, stop: moved };
        const wasAt = moved.previous === null ? 'none' : String(sig(moved.previous));
        const atEntry = Math.abs(stop_price - moved.entryPrice) / moved.entryPrice < 0.0005;
        lines.push(
          `STOP ${symbol} ${wasAt} -> ${sig(stop_price)}${atEntry ? ' (break-even)' : ''}`
        );
      }

      return { payload, body: lines.join('\n') };
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

server.registerTool(
  'record_lesson',
  {
    title: 'Record lesson',
    description:
      'Save a durable observation that will be shown to you at the start of every future cycle. Use it for things that should change how you trade from now on — a pattern that keeps costing money, a setup that keeps working, a rule you want to hold yourself to. Not for this cycle\'s reasoning, which belongs in record_analysis. Keep each lesson to one specific, actionable sentence. When a new conclusion contradicts or narrows an existing lesson, pass `replaces` with that lesson\'s timestamp so the stale one is removed instead of both being carried — a contradicted lesson left in place will be acted on. Pass `retire` alone to delete a lesson the record has since disproved. Only the most recent 25 are kept.',
    inputSchema: z.object({
      lesson: z.string().min(1).max(400).optional(),
      replaces: z.string().min(4).optional(),
      retire: z.string().min(4).optional(),
    }),
  },
  async ({ lesson, replaces, retire }) =>
    record('record_lesson', { lesson, replaces, retire }, async () => {
      if (retire) {
        const { kept, retired } = retireLesson(retire);
        return { payload: { count: kept.length }, body: `Retired "${retired.slice(0, 60)}...". ${kept.length} lessons now carried.` };
      }
      if (!lesson) throw new Error('Provide `lesson` to save one, or `retire` to remove one');
      const { kept, dropped, replaced } = addLesson(lesson, replaces);
      const parts = [`Lesson saved. ${kept.length} now carried into every cycle`];
      if (replaced) parts.push(`replaced "${replaced.slice(0, 48)}..."`);
      if (dropped > 0) parts.push(`oldest ${dropped} dropped`);
      return { payload: { count: kept.length }, body: parts.join('; ') + '.' };
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

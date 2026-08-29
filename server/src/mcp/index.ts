import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import { TRADING_SYMBOLS } from '../config/exchange';
import { closeDatabase } from '../config/database';
import {
  createPosition,
  closePosition,
  getAccountMetrics,
  getOpenPositions,
} from '../lib/exchange/helper';
import { round } from '../lib/utils';
import { describeError } from '../lib/errors';
import { snapshot, snapshotAll, screenSymbol, renderScreen, renderDetail } from './market';
import {
  getAccountId,
  currentInvocationId,
  recordMarketData,
  recordAnalysis,
  appendToolCall,
} from './session';

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

const server = new McpServer({ name: 'bitnerve', version: '1.0.0' });

server.registerTool(
  'get_account_state',
  {
    title: 'Account state',
    description:
      'Current balance, equity, reserved margin, realised PnL and every open position. Call this before deciding anything.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const accountId = await getAccountId();
    const metrics = await getAccountMetrics(accountId);
    const positions = await getOpenPositions(accountId);

    const lines = [
      `account value      ${round(metrics.accountValue, 2)}`,
      `available cash     ${round(metrics.availableCash, 2)}`,
      `reserved margin    ${round(metrics.reservedMargin, 2)}`,
      `net exposure       ${round(metrics.cryptoValue, 2)}`,
      `unrealised pnl     ${round(metrics.unrealizedPnL, 2)}`,
      `total return       ${round(metrics.totalReturnPercent, 2)}%`,
      `initial balance    ${round(metrics.initialBalance, 2)}`,
      '',
      positions.length ? 'OPEN POSITIONS' : 'No open positions.',
      ...positions.map(p => {
        const qty = parseFloat(p.quantity);
        const entry = parseFloat(p.entry_price);
        const current = parseFloat(p.current_price);
        const pnl = parseFloat(p.unrealized_pnl);
        return `${p.symbol.padEnd(9)} ${(p.side === 'BUY' ? 'LONG' : 'SHORT').padEnd(6)} qty ${round(qty, 6)}  entry ${round(entry, 4)}  mark ${round(current, 4)}  ${p.leverage}x  pnl ${round(pnl, 2)}`;
      }),
    ];

    return text(lines.join('\n'));
  }
);

server.registerTool(
  'screen_symbols',
  {
    title: 'Screen all symbols',
    description: `Ranked one-line summary of all ${TRADING_SYMBOLS.length} tradable symbols: 4h trend, momentum, volatility regime, volume and funding. Start every cycle here, then pull detail only for the candidates worth acting on.`,
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const all = await snapshotAll();
    const rows = all.map(({ symbol, data }) => screenSymbol(symbol, data));
    await recordMarketData(rows);
    return text(renderScreen(rows));
  }
);

server.registerTool(
  'get_symbol_detail',
  {
    title: 'Symbol detail',
    description:
      'Full intraday and 4h indicator series for one symbol. Use it on the one or two candidates that screen_symbols ranked highest, not on everything.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ symbol }) => {
    const data = await snapshot(symbol);
    return text(renderDetail(symbol, data));
  }
);

server.registerTool(
  'create_position',
  {
    title: 'Open position',
    description:
      'Open a BUY (long) or SELL (short) perpetual futures position at the current mark. Margin is deducted as notional / leverage; the call is rejected if free cash cannot cover it. One position per symbol.',
    inputSchema: z.object({
      symbol: z.enum(TRADING_SYMBOLS as [string, ...string[]]),
      side: z.enum(['BUY', 'SELL']),
      quantity: z.number().positive(),
      leverage: z.number().int().min(1).max(25).optional(),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ symbol, side, quantity, leverage }) =>
    record('create_position', { symbol, side, quantity, leverage }, async () => {
      const accountId = await getAccountId();
      const invocationId = await currentInvocationId();
      const data = await snapshot(symbol);
      const result = await createPosition(
        accountId,
        symbol,
        side,
        quantity,
        data.currentPrice,
        invocationId,
        leverage ?? 1
      );

      const lev = result.position.leverage;
      const notional = data.currentPrice * quantity;
      return {
        payload: result,
        body: [
          `FILLED ${side} ${quantity} ${symbol} @ ${round(data.currentPrice, 4)}`,
          `leverage ${lev}x  notional ${round(notional, 2)}  margin ${round(notional / lev, 2)}`,
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
      const result = await closePosition(accountId, symbol, quantity, invocationId);

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
  async ({ reasoning, action }) => {
    await recordAnalysis(reasoning, action === 'flat' ? 'stop' : 'tool-calls');
    return text(`Recorded (${action}).`);
  }
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

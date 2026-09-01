import { getAccountMetrics, getOpenPositions, markPositionsToMarket, upsertMarketPrices, getRecentTrades, enforceExits, getPositionOrders, type ExitEvent } from '../lib/exchange/helper';
import { snapshotAll, screenSymbol, renderScreen, renderDetail, livePrices, type SymbolScreen } from './market';
import { round, sig } from '../lib/utils';
import { readLessons } from '../lib/lessons';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function renderAccount(accountId: string): Promise<string> {
  const open = await getOpenPositions(accountId);
  if (open.length > 0) {
    await markPositionsToMarket(accountId, await livePrices([...new Set(open.map(p => p.symbol))]));
  }

  const metrics = await getAccountMetrics(accountId);
  const positions = await getOpenPositions(accountId);
  const resting = await getPositionOrders(accountId);

  return [
    'YOUR ACCOUNT',
    `account value      ${round(metrics.accountValue, 2)}`,
    `available cash     ${round(metrics.availableCash, 2)}`,
    `reserved margin    ${round(metrics.reservedMargin, 2)}`,
    `net exposure       ${round(metrics.cryptoValue, 2)}`,
    `unrealised pnl     ${round(metrics.unrealizedPnL, 2)}`,
    `total return       ${round(metrics.totalReturnPercent, 2)}%`,
    `sharpe ratio       ${metrics.sharpeRatio === null || metrics.sharpeRatio === undefined ? 'n/a' : round(Number(metrics.sharpeRatio), 3)}`,
    `initial balance    ${round(metrics.initialBalance, 2)}`,
    '',
    positions.length ? 'OPEN POSITIONS' : 'No open positions.',
    ...positions.map(p => {
      const entry = parseFloat(p.entry_price);
      const mark = parseFloat(p.current_price);
      const quantity = parseFloat(p.quantity);
      const stop = p.stop_price !== null ? parseFloat(p.stop_price) : null;
      const risk = stop !== null ? Math.abs(mark - stop) * quantity : null;
      const rMultiple =
        stop !== null && Math.abs(entry - stop) > 0
          ? (p.side === 'BUY' ? mark - entry : entry - mark) / Math.abs(entry - stop)
          : null;

      const head = [
        p.symbol.padEnd(9),
        (p.side === 'BUY' ? 'LONG' : 'SHORT').padEnd(6),
        `qty ${round(quantity, 6)}`,
        `entry ${sig(entry)}`,
        `mark ${sig(mark)}`,
        `${p.leverage}x`,
        `pnl ${round(parseFloat(p.unrealized_pnl), 2)}`,
        stop !== null ? `stop ${sig(stop)}` : 'stop NONE',
        risk !== null ? `at risk ${round(risk, 2)}` : '',
        rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${round(rMultiple, 2)}R` : '',
      ].filter(Boolean).join('  ');

      const armed = resting
        .filter(o => o.position_id === p.id)
        .sort((a, b) => parseFloat(a.trigger_price) - parseFloat(b.trigger_price))
        .map(o => {
          const at = sig(parseFloat(o.trigger_price));
          if (o.kind === 'CUT') return `CUT all at ${at}`;
          if (o.kind === 'TAKE_PROFIT') return `${o.label} close ${round(parseFloat(o.quantity ?? '0'), 6)} at ${at}`;
          if (o.kind === 'MOVE_STOP') return `${o.label} stop -> ${sig(parseFloat(o.new_stop ?? '0'))} at ${at}`;
          return `${o.label} trail ${sig(parseFloat(o.trail_distance ?? '0'))} from ${at}`;
        });

      return armed.length ? `${head}\n${' '.repeat(11)}armed: ${armed.join('  |  ')}` : head;
    }),
  ].join('\n');
}

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16);

function renderExits(events: ExitEvent[]): string {
  if (events.length === 0) return '';
  return [
    'EXITS EXECUTED SINCE LAST CYCLE — the watcher fired these between cycles, at the level, without you',
    '',
    ...events.map(e => {
      const who = `${e.symbol} ${e.side === 'BUY' ? 'LONG' : 'SHORT'}`;
      if (e.kind === 'STOP') {
        return `${clock(e.at)}  ${who} ${e.label} hit ${sig(e.triggerPrice)} — filled ${sig(e.fillPrice!)}${e.gapped ? ' (gapped through)' : ''}  qty ${round(e.quantity!, 6)}  net realised ${round(e.realizedPnL!, 2)}`;
      }
      if (e.kind === 'CUT') {
        return `${clock(e.at)}  ${who} CUT level ${sig(e.triggerPrice)} broke — filled ${sig(e.fillPrice!)}${e.gapped ? ' (gapped through)' : ''}  qty ${round(e.quantity!, 6)}  net realised ${round(e.realizedPnL!, 2)}  (thesis invalidated ahead of the stop)`;
      }
      if (e.kind === 'TAKE_PROFIT') {
        return `${clock(e.at)}  ${who} ${e.label} take-profit at ${sig(e.triggerPrice)} — closed ${round(e.quantity!, 6)}  net realised ${round(e.realizedPnL!, 2)}`;
      }
      if (e.kind === 'MOVE_STOP') {
        return `${clock(e.at)}  ${who} ${e.label} reached — stop moved to ${sig(e.newStop!)}`;
      }
      return `${clock(e.at)}  ${who} ${e.label} reached — trailing stop armed`;
    }),
  ].join('\n');
}

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

async function renderHistory(accountId: string): Promise<string> {
  const trades = await getRecentTrades(accountId, 10);
  if (trades.length === 0) return 'RECENT TRADES\n\nNone closed yet.';

  let gross = 0;
  let fees = 0;
  let net = 0;

  const rows = trades.map(t => {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    const g = Number(meta.gross_pnl ?? 0);
    const f = Number(meta.entry_fee ?? 0) + Number(meta.exit_fee ?? 0);
    const n = parseFloat(t.realized ?? '0');
    gross += g;
    fees += f;
    net += n;

    return [
      t.symbol.padEnd(9),
      (t.side === 'BUY' ? 'LONG' : 'SHORT').padEnd(6),
      `${round(parseFloat(t.entryPrice), 4)} -> ${round(parseFloat(t.exitPrice ?? '0'), 4)}`.padEnd(24),
      `${minutesBetween(t.openedAt, t.closedAt)}m`.padStart(6),
      `${round(g, 2)}`.padStart(9),
      `${round(f, 2)}`.padStart(7),
      `${round(n, 2)}`.padStart(9),
    ].join(' ');
  });

  return [
    'RECENT TRADES — your last closed round trips, newest first',
    '',
    `${'SYMBOL'.padEnd(9)} ${'SIDE'.padEnd(6)} ${'ENTRY -> EXIT'.padEnd(24)} ${'HELD'.padStart(6)} ${'GROSS'.padStart(9)} ${'FEES'.padStart(7)} ${'NET'.padStart(9)}`,
    ...rows,
    '',
    `Across these ${trades.length}: gross ${round(gross, 2)}, fees ${round(fees, 2)}, net ${round(net, 2)}.`,
    'FEES is what the round trip cost you. A trade whose move does not clear it loses money even when the direction is right.',
  ].join('\n');
}

function renderPlan(): string {
  try {
    const plan = readFileSync(join(import.meta.dir, '../../prompts/plan.md'), 'utf8').trim();
    return plan ? ['STANDING EXECUTION PLAN — follow this until it is replaced', '', plan].join('\n') : '';
  } catch {
    return '';
  }
}

function renderLessons(): string {
  const lessons = readLessons();
  if (lessons.length === 0) return '';
  return ['LESSONS — what you have concluded on earlier cycles', '', ...lessons.map(l => `- ${l}`)].join('\n');
}

export async function buildBrief(accountId: string): Promise<{ text: string; rows: SymbolScreen[] }> {
  const all = await snapshotAll();
  const rows = all.map(({ symbol, data }) => screenSymbol(symbol, data));
  await upsertMarketPrices(rows.map(r => ({ symbol: r.symbol, price: r.price })));

  const exitEvents = await enforceExits(
    accountId,
    new Map(all.map(({ symbol, data }) => [symbol, data.intraday.candles]))
  );

  const details = await Promise.all(all.map(({ symbol, data }) => renderDetail(symbol, data)));

  const stops = renderExits(exitEvents);
  const plan = renderPlan();
  const lessons = renderLessons();

  const text = [
    await renderAccount(accountId),
    '',
    ...(stops ? [stops, ''] : []),
    await renderHistory(accountId),
    '',
    ...(plan ? [plan, ''] : []),
    ...(lessons ? [lessons, ''] : []),
    'MARKET OVERVIEW — all tradable symbols, latest readings',
    renderScreen(rows),
    '',
    'FULL SERIES PER SYMBOL — all series ordered oldest to newest: 15m execution, 1h ranking, 4h regime',
    '',
    details.join('\n\n'),
    '',
    'Rank the long and short candidates across these symbols, then act.',
  ].join('\n');

  return { text, rows };
}

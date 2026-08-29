import { getAccountMetrics, getOpenPositions, markPositionsToMarket, upsertMarketPrices, getRecentTrades } from '../lib/exchange/helper';
import { snapshotAll, screenSymbol, renderScreen, renderDetail, livePrices, type SymbolScreen } from './market';
import { round } from '../lib/utils';
import { readLessons } from '../lib/lessons';
import { previousAnalysis } from './session';

async function renderAccount(accountId: string): Promise<string> {
  const open = await getOpenPositions(accountId);
  if (open.length > 0) {
    await markPositionsToMarket(accountId, await livePrices([...new Set(open.map(p => p.symbol))]));
  }

  const metrics = await getAccountMetrics(accountId);
  const positions = await getOpenPositions(accountId);

  return [
    'YOUR ACCOUNT',
    `account value      ${round(metrics.accountValue, 2)}`,
    `available cash     ${round(metrics.availableCash, 2)}`,
    `reserved margin    ${round(metrics.reservedMargin, 2)}`,
    `net exposure       ${round(metrics.cryptoValue, 2)}`,
    `unrealised pnl     ${round(metrics.unrealizedPnL, 2)}`,
    `total return       ${round(metrics.totalReturnPercent, 2)}%`,
    `sharpe ratio       ${metrics.sharpeRatio ?? 'n/a'}`,
    `initial balance    ${round(metrics.initialBalance, 2)}`,
    '',
    positions.length ? 'OPEN POSITIONS' : 'No open positions.',
    ...positions.map(p =>
      `${p.symbol.padEnd(9)} ${(p.side === 'BUY' ? 'LONG' : 'SHORT').padEnd(6)} qty ${round(parseFloat(p.quantity), 6)}  entry ${round(parseFloat(p.entry_price), 4)}  mark ${round(parseFloat(p.current_price), 4)}  ${p.leverage}x  pnl ${round(parseFloat(p.unrealized_pnl), 2)}`
    ),
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

function renderLessons(): string {
  const lessons = readLessons();
  if (lessons.length === 0) return '';
  return ['LESSONS — what you have concluded on earlier cycles', '', ...lessons.map(l => `- ${l}`)].join('\n');
}

export async function buildBrief(accountId: string): Promise<{ text: string; rows: SymbolScreen[] }> {
  const all = await snapshotAll();
  const rows = all.map(({ symbol, data }) => screenSymbol(symbol, data));
  await upsertMarketPrices(rows.map(r => ({ symbol: r.symbol, price: r.price })));

  const details = await Promise.all(all.map(({ symbol, data }) => renderDetail(symbol, data)));

  const previous = await previousAnalysis(accountId);
  const lessons = renderLessons();

  const text = [
    await renderAccount(accountId),
    '',
    await renderHistory(accountId),
    '',
    ...(previous ? ['WHAT YOU CONCLUDED LAST CYCLE', '', previous, ''] : []),
    ...(lessons ? [lessons, ''] : []),
    'MARKET OVERVIEW — all tradable symbols, latest readings',
    renderScreen(rows),
    '',
    'FULL SERIES PER SYMBOL — all series ordered oldest to newest, intraday at 5-minute intervals',
    '',
    details.join('\n\n'),
    '',
    'Rank the long and short candidates across these symbols, then act.',
  ].join('\n');

  return { text, rows };
}

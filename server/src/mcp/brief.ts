import { getAccountMetrics, getOpenPositions, markPositionsToMarket, upsertMarketPrices } from '../lib/exchange/helper';
import { snapshotAll, screenSymbol, renderScreen, renderDetail, livePrices, type SymbolScreen } from './market';
import { round } from '../lib/utils';

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

export async function buildBrief(accountId: string): Promise<{ text: string; rows: SymbolScreen[] }> {
  const all = await snapshotAll();
  const rows = all.map(({ symbol, data }) => screenSymbol(symbol, data));
  await upsertMarketPrices(rows.map(r => ({ symbol: r.symbol, price: r.price })));

  const details = await Promise.all(all.map(({ symbol, data }) => renderDetail(symbol, data)));

  const text = [
    await renderAccount(accountId),
    '',
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

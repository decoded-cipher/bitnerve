import { getKlinesData, getFuturesTicker } from '../lib/exchange/api';
import { getSymbolExchange } from '../config/symbols';
import { getOrCreateAccount, getOpenPositions, enforceExits, markPositionsToMarket, getPositionOrders, getAccountMetrics, type StopCandle } from '../lib/exchange/helper';
import { round, sig } from '../lib/utils';

const INTERVAL_SECONDS = Number.parseInt(process.env.WATCH_INTERVAL_SECONDS ?? '', 10) || 60;
const LOOKBACK_MINUTES = Number.parseInt(process.env.WATCH_LOOKBACK_MINUTES ?? '', 10) || 90;

const stamp = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().replace('T', ' ').slice(0, 19);
const log = (...args: unknown[]) => console.log(stamp(), ...args);

async function candlesFor(symbols: string[]): Promise<Map<string, StopCandle[]>> {
  const entries = await Promise.all(
    symbols.map(async symbol => {
      try {
        const raw = await getKlinesData({
          symbol,
          interval: 1,
          start_time: Date.now() - LOOKBACK_MINUTES * 60_000,
          end_time: Date.now(),
          exchange: getSymbolExchange(symbol),
        } as any);
        return [symbol, Array.isArray(raw) ? (raw as StopCandle[]) : []] as const;
      } catch (error) {
        log(`kline fetch failed for ${symbol}:`, error instanceof Error ? error.message : error);
        return [symbol, [] as StopCandle[]] as const;
      }
    })
  );
  return new Map(entries);
}

const pct = (from: number, to: number) => `${to >= from ? '+' : ''}${(((to - from) / from) * 100).toFixed(2)}%`;

async function livePrices(symbols: string[]): Promise<Map<string, number>> {
  const entries = await Promise.all(
    symbols.map(async symbol => {
      try {
        const exchange = getSymbolExchange(symbol);
        const ticker = await getFuturesTicker({ symbol, exchange });
        const data = (ticker as any)?.data?.[exchange] ?? ticker;
        const price = Number.parseFloat((data as any)?.last_price);
        return [symbol, Number.isFinite(price) && price > 0 ? price : NaN] as const;
      } catch {
        return [symbol, NaN] as const;
      }
    })
  );
  return new Map(entries.filter(([, p]) => Number.isFinite(p)));
}

async function tick(accountId: string): Promise<void> {
  const open = await getOpenPositions(accountId);

  if (open.length === 0) {
    const metrics = await getAccountMetrics(accountId);
    log(`flat  cash ${round(metrics.availableCash, 2)}  value ${round(metrics.accountValue, 2)}`);
    return;
  }

  const symbols = [...new Set(open.map(p => p.symbol))];
  const [candles, ticks] = await Promise.all([candlesFor(symbols), livePrices(symbols)]);

  const events = await enforceExits(accountId, candles);
  for (const e of events) {
    if (e.kind === 'STOP') {
      log(`FIRED ${e.symbol} ${e.label} ${sig(e.triggerPrice)} -> filled ${sig(e.fillPrice!)}${e.gapped ? ' (gapped)' : ''}  closed ${round(e.quantity!, 6)}  net ${round(e.realizedPnL!, 2)}`);
    } else if (e.kind === 'TAKE_PROFIT') {
      log(`FIRED ${e.symbol} ${e.label} take-profit ${sig(e.triggerPrice)} -> closed ${round(e.quantity!, 6)}  net ${round(e.realizedPnL!, 2)}`);
    } else if (e.kind === 'MOVE_STOP') {
      log(`FIRED ${e.symbol} ${e.label} -> stop moved to ${sig(e.newStop!)}`);
    } else {
      log(`FIRED ${e.symbol} ${e.label} -> trailing stop armed (${sig(e.triggerPrice)})`);
    }
  }

  const marks = new Map(ticks);
  for (const [symbol, bars] of candles) {
    if (marks.has(symbol)) continue;
    const latest = bars[bars.length - 1];
    if (latest) marks.set(symbol, Number((latest as any).c));
  }
  if (marks.size > 0) await markPositionsToMarket(accountId, marks);

  const live = await getOpenPositions(accountId);
  if (live.length === 0) {
    const metrics = await getAccountMetrics(accountId);
    log(`flat  cash ${round(metrics.availableCash, 2)}  value ${round(metrics.accountValue, 2)}`);
    return;
  }

  const resting = await getPositionOrders(accountId);

  for (const p of live) {
    const mark = marks.get(p.symbol) ?? parseFloat(p.current_price);
    const entry = parseFloat(p.entry_price);
    const stop = p.stop_price !== null ? parseFloat(p.stop_price) : null;
    const isLong = p.side === 'BUY';
    const dir = isLong ? 1 : -1;

    const parts = [
      p.symbol.padEnd(9),
      `mark ${String(sig(mark)).padEnd(10)}`,
      `pnl ${round(parseFloat(p.unrealized_pnl), 2).toString().padStart(8)}`,
    ];

    if (stop !== null && Math.abs(entry - stop) > 0) {
      const r = ((mark - entry) * dir) / Math.abs(entry - stop);
      parts.push(`${r >= 0 ? '+' : ''}${r.toFixed(2)}R`.padStart(7));
      parts.push(`stop ${sig(stop)} (${pct(mark, stop)})`);
    } else {
      parts.push('  no stop');
    }

    const next = resting
      .filter(o => o.position_id === p.id)
      .map(o => ({ label: o.label, at: parseFloat(o.trigger_price) }))
      .sort((a, b) => (isLong ? a.at - b.at : b.at - a.at))[0];

    parts.push(next ? `next ${next.label} ${sig(next.at)} (${pct(mark, next.at)})` : 'ladder done');

    log(parts.join('  '));
  }
}

const account = await getOrCreateAccount();
log(`watching account ${account.id} every ${INTERVAL_SECONDS}s (1m candles, ${LOOKBACK_MINUTES}m lookback)`);

let running = true;
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]] as const) {
  process.on(signal, () => {
    log('shutting down');
    running = false;
    process.exit(code);
  });
}

while (running) {
  try {
    await tick(account.id);
  } catch (error) {
    log('tick failed:', error instanceof Error ? error.message : error);
  }
  await new Promise(resolve => setTimeout(resolve, INTERVAL_SECONDS * 1000));
}

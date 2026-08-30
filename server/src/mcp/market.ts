import { getMarketData } from '../lib/exchange';
import { TRADING_SYMBOLS } from '../config/exchange';
import { formatArray, round } from '../lib/utils';
import { getInstrument, describeConstraints } from '../lib/exchange/instruments';

type Snapshot = Awaited<ReturnType<typeof getMarketData>>;

const CACHE_TTL_MS = Number.parseInt(process.env.MARKET_CACHE_TTL_MS ?? '', 10) || 120_000;

const cache = new Map<string, { at: number; data: Snapshot }>();

export async function snapshot(symbol: string): Promise<Snapshot> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }
  const data = await getMarketData(symbol, 5);
  cache.set(symbol, { at: Date.now(), data });
  return data;
}

export async function snapshotAll(): Promise<Array<{ symbol: string; data: Snapshot }>> {
  return Promise.all(
    TRADING_SYMBOLS.map(async symbol => ({ symbol, data: await snapshot(symbol) }))
  );
}

const last = (arr: number[]): number => (arr.length ? arr[arr.length - 1] : 0);

export interface SymbolScreen {
  symbol: string;
  price: number;
  ema20h4: number;
  ema50h4: number;
  trendGapPct: number;
  macdH4: number;
  rsi14h4: number;
  macd5m: number;
  rsi7: number;
  atrRatio: number;
  volumeRatio: number;
  fundingRate: number;
}

export function screenSymbol(symbol: string, data: Snapshot): SymbolScreen {
  const ema20h4 = last(data.longerTerm.ema20);
  const ema50h4 = last(data.longerTerm.ema50);
  const atr3 = last(data.longerTerm.atr3);
  const atr14 = last(data.longerTerm.atr14);
  const avgVolume = data.longerTerm.volumeData.averageVolume;

  return {
    symbol,
    price: round(data.currentPrice, 4),
    ema20h4: round(ema20h4, 2),
    ema50h4: round(ema50h4, 2),
    trendGapPct: round(ema50h4 !== 0 ? ((ema20h4 - ema50h4) / ema50h4) * 100 : 0, 2),
    macdH4: round(last(data.longerTerm.macd), 2),
    rsi14h4: round(last(data.longerTerm.rsi14), 1),
    macd5m: round(data.currentMacd ?? last(data.intraday.macd), 2),
    rsi7: round(data.currentRsi7 ?? last(data.intraday.rsi7), 1),
    atrRatio: round(atr14 !== 0 ? atr3 / atr14 : 1, 2),
    volumeRatio: round(avgVolume !== 0 ? data.longerTerm.volumeData.currentVolume / avgVolume : 0, 2),
    fundingRate: round(Number(data.fundingRate) || 0, 6),
  };
}

export function renderScreen(rows: SymbolScreen[]): string {
  const header = 'SYMBOL     PRICE        EMA20-50/4H  MACD/4H   RSI14/4H  MACD/5M   RSI7/5M  ATR3/14  VOL\u00d7   FUNDING';
  const lines = rows.map(r =>
    [
      r.symbol.padEnd(10),
      String(r.price).padEnd(12),
      `${r.trendGapPct > 0 ? '+' : ''}${r.trendGapPct}%`.padEnd(12),
      String(r.macdH4).padEnd(9),
      String(r.rsi14h4).padEnd(9),
      String(r.macd5m).padEnd(9),
      String(r.rsi7).padEnd(8),
      String(r.atrRatio).padEnd(8),
      String(r.volumeRatio).padEnd(6),
      String(r.fundingRate),
    ].join(' ')
  );

  return [
    header,
    ...lines,
    '',
    'EMA20-50/4H is the 4h EMA20 relative to EMA50, as a percentage of EMA50.',
    'ATR3/14 is 4h ATR(3) over ATR(14). VOL\u00d7 is current 4h volume over its average.',
    'These are measurements in symbol order, not a ranking. Rank them yourself.',
  ].join('\n');
}

export async function renderDetail(symbol: string, data: Snapshot): Promise<string> {
  const instrument = await getInstrument(symbol);
  return [
    `${symbol} — intraday 5m series, oldest to newest`,
    `price ${round(data.currentPrice, 4)}  ema20 ${round(data.currentEma20, 2)}  macd ${round(data.currentMacd, 2)}  rsi7 ${round(data.currentRsi7, 1)}`,
    `open interest ${round(data.openInterest, 2)}  funding rate ${round(Number(data.fundingRate) || 0, 6)}`,
    '',
    `mid prices : ${formatArray(data.intraday.midPrices, 10, 2)}`,
    `ema20      : ${formatArray(data.intraday.ema20, 10, 2)}`,
    `macd       : ${formatArray(data.intraday.macd, 10, 2)}`,
    `rsi7       : ${formatArray(data.intraday.rsi7, 10, 1)}`,
    `rsi14      : ${formatArray(data.intraday.rsi14, 10, 1)}`,
    '',
    '4h context',
    `ema20 ${round(last(data.longerTerm.ema20), 2)} vs ema50 ${round(last(data.longerTerm.ema50), 2)}`,
    `atr3 ${round(last(data.longerTerm.atr3), 2)} vs atr14 ${round(last(data.longerTerm.atr14), 2)}`,
    `volume ${round(data.longerTerm.volumeData.currentVolume, 2)} vs average ${round(data.longerTerm.volumeData.averageVolume, 2)}`,
    `macd  : ${formatArray(data.longerTerm.macd, 10, 2)}`,
    `rsi14 : ${formatArray(data.longerTerm.rsi14, 10, 1)}`,
    '',
    `exchange constraints: ${describeConstraints(instrument)}`,
  ].join('\n');
}

export async function livePrices(symbols: string[]): Promise<Map<string, number>> {
  const entries = await Promise.all(
    symbols.map(async symbol => [symbol, (await snapshot(symbol)).currentPrice] as const)
  );
  return new Map(entries.filter(([, price]) => Number.isFinite(price) && price > 0));
}

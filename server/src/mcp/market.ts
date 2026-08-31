import { getMarketData } from '../lib/exchange';
import { TRADING_SYMBOLS } from '../config/exchange';
import { formatArray, formatSeries, round, sig } from '../lib/utils';
import { getInstrument, describeConstraints } from '../lib/exchange/instruments';

type Snapshot = Awaited<ReturnType<typeof getMarketData>>;

const CACHE_TTL_MS = Number.parseInt(process.env.MARKET_CACHE_TTL_MS ?? '', 10) || 120_000;

const cache = new Map<string, { at: number; data: Snapshot }>();

export async function snapshot(symbol: string): Promise<Snapshot> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }
  const data = await getMarketData(symbol, 15);
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
  trend4hPct: number;
  trend1hPct: number;
  macd1h: number;
  rsi14h1: number;
  macd15m: number;
  rsi7: number;
  atrRatio: number;
  volumeRatio: number;
  fundingRate: number;
}

export function screenSymbol(symbol: string, data: Snapshot): SymbolScreen {
  const ema20h4 = last(data.longerTerm.ema20);
  const ema50h4 = last(data.longerTerm.ema50);
  const ema20h1 = last(data.midTerm.ema20);
  const ema50h1 = last(data.midTerm.ema50);
  const atr3 = last(data.midTerm.atr3);
  const atr14 = last(data.midTerm.atr14);
  const avgVolume = data.midTerm.volumeData.averageVolume;

  return {
    symbol,
    price: sig(data.currentPrice),
    trend4hPct: round(ema50h4 !== 0 ? ((ema20h4 - ema50h4) / ema50h4) * 100 : 0, 2),
    trend1hPct: round(ema50h1 !== 0 ? ((ema20h1 - ema50h1) / ema50h1) * 100 : 0, 2),
    macd1h: sig(last(data.midTerm.macd)),
    rsi14h1: round(last(data.midTerm.rsi14), 1),
    macd15m: sig(data.currentMacd ?? last(data.intraday.macd)),
    rsi7: round(data.currentRsi7 ?? last(data.intraday.rsi7), 1),
    atrRatio: round(atr14 !== 0 ? atr3 / atr14 : 1, 2),
    volumeRatio: round(avgVolume !== 0 ? data.midTerm.volumeData.currentVolume / avgVolume : 0, 2),
    fundingRate: round(Number(data.fundingRate) || 0, 6),
  };
}

export function renderScreen(rows: SymbolScreen[]): string {
  const header = 'SYMBOL     PRICE          4H TREND  1H TREND  MACD/1H    RSI14/1H  MACD/15M   RSI7/15M  ATR3/14  VOL\u00d7   FUNDING';
  const pct = (v: number) => `${v > 0 ? '+' : ''}${v}%`;
  const lines = rows.map(r =>
    [
      r.symbol.padEnd(10),
      String(r.price).padEnd(14),
      pct(r.trend4hPct).padEnd(9),
      pct(r.trend1hPct).padEnd(9),
      String(r.macd1h).padEnd(10),
      String(r.rsi14h1).padEnd(9),
      String(r.macd15m).padEnd(10),
      String(r.rsi7).padEnd(9),
      String(r.atrRatio).padEnd(8),
      String(r.volumeRatio).padEnd(6),
      String(r.fundingRate),
    ].join(' ')
  );

  return [
    header,
    ...lines,
    '',
    'TREND columns are that timeframe\'s EMA20 relative to its EMA50, as a percentage of EMA50.',
    '4h sets the regime, 1h ranks the candidates, 15m times the entry.',
    'ATR3/14 and VOL\u00d7 are on the 1h series.',
    'These are measurements in symbol order, not a ranking. Rank them yourself.',
  ].join('\n');
}

export async function renderDetail(symbol: string, data: Snapshot): Promise<string> {
  const instrument = await getInstrument(symbol);
  const roundTripPct = instrument.takerFeeRate * 2 * 100;
  const atr3h1 = last(data.midTerm.atr3);
  const atr3Pct = data.currentPrice > 0 ? (atr3h1 / data.currentPrice) * 100 : 0;

  return [
    `${symbol} — series oldest to newest`,
    `price ${sig(data.currentPrice)}  ema20/15m ${sig(data.currentEma20)}  macd/15m ${sig(data.currentMacd)}  rsi7/15m ${round(data.currentRsi7, 1)}`,
    `open interest ${round(data.openInterest, 2)}  funding rate ${round(Number(data.fundingRate) || 0, 6)}`,
    `round trip costs ${round(roundTripPct, 3)}% of notional; 1h ATR3 is ${round(atr3Pct, 2)}% of price, i.e. ${round(atr3Pct / roundTripPct, 1)} round trips`,
    '',
    '15m — execution',
    `mid prices : ${formatSeries(data.intraday.midPrices, 10)}`,
    `ema20      : ${formatSeries(data.intraday.ema20, 10)}`,
    `macd       : ${formatSeries(data.intraday.macd, 10)}`,
    `rsi7       : ${formatArray(data.intraday.rsi7, 10, 1)}`,
    `atr3 ${sig(last(data.intraday.atr3))} vs atr14 ${sig(last(data.intraday.atr14))}`,
    '',
    '1h — ranking',
    `mid prices : ${formatSeries(data.midTerm.midPrices, 10)}`,
    `macd       : ${formatSeries(data.midTerm.macd, 10)}`,
    `rsi14      : ${formatArray(data.midTerm.rsi14, 10, 1)}`,
    `ema20 ${sig(last(data.midTerm.ema20))} vs ema50 ${sig(last(data.midTerm.ema50))}`,
    `atr3 ${sig(atr3h1)} vs atr14 ${sig(last(data.midTerm.atr14))}`,
    `volume ${round(data.midTerm.volumeData.currentVolume, 2)} vs average ${round(data.midTerm.volumeData.averageVolume, 2)}`,
    '',
    '4h — regime',
    `ema20 ${sig(last(data.longerTerm.ema20))} vs ema50 ${sig(last(data.longerTerm.ema50))}`,
    `atr3 ${sig(last(data.longerTerm.atr3))} vs atr14 ${sig(last(data.longerTerm.atr14))}`,
    `volume ${round(data.longerTerm.volumeData.currentVolume, 2)} vs average ${round(data.longerTerm.volumeData.averageVolume, 2)}`,
    `macd  : ${formatSeries(data.longerTerm.macd, 10)}`,
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

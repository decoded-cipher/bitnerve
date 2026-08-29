import { getMarketData } from '../lib/exchange';
import { TRADING_SYMBOLS } from '../config/exchange';
import { formatArray, round } from '../lib/utils';

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
  trend: 'up' | 'down';
  trendStrengthPct: number;
  macd: number;
  rsi7: number;
  rsi14h4: number;
  volatility: 'expanding' | 'steady' | 'contracting';
  volumeRatio: number;
  fundingRate: number;
  bias: 'long' | 'short' | 'neutral';
  exhausted: boolean;
  score: number;
}

export function screenSymbol(symbol: string, data: Snapshot): SymbolScreen {
  const ema20h4 = last(data.longerTerm.ema20);
  const ema50h4 = last(data.longerTerm.ema50);
  const atr3 = last(data.longerTerm.atr3);
  const atr14 = last(data.longerTerm.atr14);
  const rsi14h4 = last(data.longerTerm.rsi14);
  const macd = data.currentMacd ?? last(data.intraday.macd);
  const rsi7 = data.currentRsi7 ?? last(data.intraday.rsi7);

  const trend: 'up' | 'down' = ema20h4 >= ema50h4 ? 'up' : 'down';
  const trendStrengthPct = ema50h4 !== 0 ? ((ema20h4 - ema50h4) / ema50h4) * 100 : 0;

  const atrRatio = atr14 !== 0 ? atr3 / atr14 : 1;
  const volatility: SymbolScreen['volatility'] =
    atrRatio > 1.1 ? 'expanding' : atrRatio < 0.9 ? 'contracting' : 'steady';

  const avgVolume = data.longerTerm.volumeData.averageVolume;
  const volumeRatio = avgVolume !== 0 ? data.longerTerm.volumeData.currentVolume / avgVolume : 0;

  const trendVote = trend === 'up' ? 1 : -1;
  const macdVote = macd > 0 ? 1 : macd < 0 ? -1 : 0;
  const rsiVote = rsi14h4 > 55 ? 1 : rsi14h4 < 45 ? -1 : 0;
  const agreement = trendVote + macdVote + rsiVote;

  const bias: SymbolScreen['bias'] =
    agreement >= 2 ? 'long' : agreement <= -2 ? 'short' : 'neutral';

  const exhausted =
    (bias === 'short' && rsi14h4 < 20) || (bias === 'long' && rsi14h4 > 80);

  const confluence = Math.abs(agreement) / 3;
  const magnitude = Math.min(Math.abs(trendStrengthPct) / 10, 1);
  const participation = Math.min(volumeRatio, 2) / 2;
  const raw = confluence * 0.5 + magnitude * 0.3 + participation * 0.2;
  const score = round(exhausted ? raw * 0.5 : raw, 3);

  return {
    symbol,
    price: round(data.currentPrice, 4),
    trend,
    trendStrengthPct: round(trendStrengthPct, 2),
    macd: round(macd, 2),
    rsi7: round(rsi7, 1),
    rsi14h4: round(rsi14h4, 1),
    volatility,
    volumeRatio: round(volumeRatio, 2),
    fundingRate: round(Number(data.fundingRate) || 0, 6),
    bias,
    exhausted,
    score,
  };
}

export function renderScreen(rows: SymbolScreen[]): string {
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  const header = 'SYMBOL   PRICE        BIAS     SCORE  TREND(4H)  MACD      RSI7   RSI14/4H  VOL         VOL×   FUNDING';
  const lines = ranked.map(r =>
    [
      r.symbol.padEnd(8),
      String(r.price).padEnd(12),
      (r.exhausted ? `${r.bias}!` : r.bias).padEnd(8),
      String(r.score).padEnd(6),
      `${r.trend} ${r.trendStrengthPct > 0 ? '+' : ''}${r.trendStrengthPct}%`.padEnd(10),
      String(r.macd).padEnd(9),
      String(r.rsi7).padEnd(6),
      String(r.rsi14h4).padEnd(9),
      r.volatility.padEnd(11),
      String(r.volumeRatio).padEnd(6),
      String(r.fundingRate),
    ].join(' ')
  );

  return [
    header,
    ...lines,
    '',
    'score = 0.5*indicator confluence + 0.3*4h trend magnitude + 0.2*volume participation.',
    'A "!" on the bias means 4h RSI is already exhausted in that direction and the score is halved:',
    'the move is late, and a reversal is the likelier edge than joining it.',
    'It ranks setups only; it is not a signal. Pull get_symbol_detail before acting.',
  ].join('\n');
}

export function renderDetail(symbol: string, data: Snapshot): string {
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
  ].join('\n');
}

import { writeFileSync } from 'node:fs';
import { getFuturesInstrumentInfo } from '../lib/exchange/api';
import { FUTURES_EXCHANGES } from '../types';
import { SYMBOLS_FILE, loadSymbolFile, type SymbolEntry } from '../config/symbols';

const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const catalogues = new Map<string, Record<string, Record<string, unknown>>>();
for (const exchange of FUTURES_EXCHANGES) {
  const response = await getFuturesInstrumentInfo({ exchange });
  catalogues.set(exchange, (response?.data ?? {}) as Record<string, Record<string, unknown>>);
}

const current = loadSymbolFile();
const updated: SymbolEntry[] = [];
const missing: string[] = [];

for (const entry of current.symbols) {
  const key = entry.symbol.toUpperCase();
  const listings = FUTURES_EXCHANGES.filter(e => catalogues.get(e)?.[key]);

  const exchange = listings.includes(entry.exchange)
    ? entry.exchange
    : listings.sort((a, b) => {
        const ia = catalogues.get(a)![key];
        const ib = catalogues.get(b)![key];
        return num(ia.taker_fee_rate) - num(ib.taker_fee_rate)
          || num(ib.max_leverage) - num(ia.max_leverage);
      })[0];

  if (!exchange) {
    missing.push(entry.symbol);
    updated.push(entry);
    continue;
  }

  const info = catalogues.get(exchange)![key];
  updated.push({
    ...entry,
    exchange,
    constraints: {
      minQuantity: num(info.min_base_quantity),
      quantityStep: num(info.base_quantity_step_size),
      quantityPrecision: num(info.quantity_precision),
      pricePrecision: num(info.price_precision),
      minLeverage: num(info.min_leverage, 1),
      maxLeverage: num(info.max_leverage, 1),
      maxQuantity: num(info.max_market_base_quantity),
      takerFeeRate: num(info.taker_fee_rate),
      makerFeeRate: num(info.maker_fee_rate),
      maintMarginRate: num(info.maint_margin_rate),
    },
  });
}

writeFileSync(SYMBOLS_FILE, `${JSON.stringify({ constraintsSyncedAt: new Date().toISOString(), symbols: updated }, null, 2)}\n`);

console.log(`Synced ${updated.length - missing.length}/${updated.length} symbols across ${FUTURES_EXCHANGES.join(', ')}`);
for (const entry of updated) {
  const c = entry.constraints;
  console.log(
    `  ${entry.symbol.padEnd(11)} ${(entry.exchange ?? '?').padEnd(11)} min ${String(c.minQuantity).padEnd(7)} step ${String(c.quantityStep).padEnd(7)} maxLev ${String(c.maxLeverage).padEnd(4)} taker ${(c.takerFeeRate * 100).toFixed(3)}%  round trip ${(c.takerFeeRate * 200).toFixed(3)}%`
  );
}
if (missing.length > 0) {
  console.warn(`\nNot found on any venue, left unchanged: ${missing.join(', ')}`);
}
console.log(`\nWrote ${SYMBOLS_FILE}`);

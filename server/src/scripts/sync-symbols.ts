import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFuturesInstrumentInfo } from '../lib/exchange/api';
import { FUTURES_EXCHANGE } from '../types';
import { SYMBOLS_FILE, loadSymbolFile, type SymbolEntry } from '../config/symbols';

const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const response = await getFuturesInstrumentInfo({ exchange: FUTURES_EXCHANGE });
const catalogue = (response?.data ?? {}) as Record<string, Record<string, unknown>>;

const current = loadSymbolFile();
const updated: SymbolEntry[] = [];
const missing: string[] = [];

for (const entry of current.symbols) {
  const info = catalogue[entry.symbol.toUpperCase()];
  if (!info) {
    missing.push(entry.symbol);
    updated.push(entry);
    continue;
  }

  updated.push({
    ...entry,
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

const payload = {
  constraintsSyncedAt: new Date().toISOString(),
  symbols: updated,
};

writeFileSync(SYMBOLS_FILE, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Synced ${updated.length - missing.length}/${updated.length} symbols from ${FUTURES_EXCHANGE}`);
for (const entry of updated) {
  const c = entry.constraints;
  console.log(
    `  ${entry.symbol.padEnd(10)} min ${String(c.minQuantity).padEnd(8)} step ${String(c.quantityStep).padEnd(8)} qtyPrec ${String(c.quantityPrecision).padEnd(3)} maxLev ${String(c.maxLeverage).padEnd(5)} taker ${(c.takerFeeRate * 100).toFixed(3)}%`
  );
}
if (missing.length > 0) {
  console.warn(`\nNot found on the exchange, left unchanged: ${missing.join(', ')}`);
}
console.log(`\nWrote ${SYMBOLS_FILE}`);

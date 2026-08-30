import { getFuturesInstrumentInfo } from './api';
import { getSymbolEntry, getSymbolExchange } from '../../config/symbols';

export interface Instrument {
  symbol: string;
  minQuantity: number;
  quantityStep: number;
  quantityPrecision: number;
  pricePrecision: number;
  minLeverage: number;
  maxLeverage: number;
  maxQuantity: number;
  takerFeeRate: number;
  makerFeeRate: number;
  maintMarginRate: number;
}

function fallbackFor(symbol: string): Instrument {
  const entry = getSymbolEntry(symbol);
  return { symbol: symbol.toUpperCase(), ...(entry?.constraints ?? {
    minQuantity: 0,
    quantityStep: 0,
    quantityPrecision: 8,
    pricePrecision: 8,
    minLeverage: 1,
    maxLeverage: 1,
    maxQuantity: 0,
    takerFeeRate: 0,
    makerFeeRate: 0,
    maintMarginRate: 0,
  }) };
}

const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const caches = new Map<string, Promise<Map<string, Instrument>>>();

function loadInstruments(exchange: string): Promise<Map<string, Instrument>> {
  let cache = caches.get(exchange);
  if (!cache) {
    cache = (async () => {
      const response = await getFuturesInstrumentInfo({ exchange });
      const raw = (response?.data ?? {}) as Record<string, Record<string, unknown>>;
      const map = new Map<string, Instrument>();

      for (const [symbol, info] of Object.entries(raw)) {
        map.set(symbol.toUpperCase(), {
          symbol: symbol.toUpperCase(),
          minQuantity: num(info.min_base_quantity),
          quantityStep: num(info.base_quantity_step_size),
          quantityPrecision: num(info.quantity_precision),
          pricePrecision: num(info.price_precision),
          minLeverage: num(info.min_leverage, 1),
          maxLeverage: num(info.max_leverage),
          maxQuantity: num(info.max_market_base_quantity),
          takerFeeRate: num(info.taker_fee_rate),
          makerFeeRate: num(info.maker_fee_rate),
          maintMarginRate: num(info.maint_margin_rate),
        });
      }

      return map;
    })().catch(error => {
      caches.delete(exchange);
      throw error;
    });
    caches.set(exchange, cache);
  }

  return cache;
}

export async function getInstrument(symbol: string): Promise<Instrument> {
  try {
    const found = (await loadInstruments(getSymbolExchange(symbol))).get(symbol.toUpperCase());
    if (found) return found;
  } catch {
    // ignore and fall back
  }
  return fallbackFor(symbol);
}

// Snap a quantity down to the instrument's step size
export function roundQuantity(quantity: number, instrument: Instrument): number {
  const step = instrument.quantityStep > 0 ? instrument.quantityStep : undefined;
  const snapped = step ? Math.floor(quantity / step) * step : quantity;
  return Number(snapped.toFixed(instrument.quantityPrecision));
}

export function describeConstraints(instrument: Instrument): string {
  return [
    `min qty ${instrument.minQuantity}`,
    `step ${instrument.quantityStep || 'n/a'}`,
    `qty precision ${instrument.quantityPrecision}`,
    `max leverage ${instrument.maxLeverage}x`,
    `taker fee ${(instrument.takerFeeRate * 100).toFixed(3)}%`,
  ].join('  ');
}

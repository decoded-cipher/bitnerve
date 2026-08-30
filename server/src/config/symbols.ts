import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FUTURES_EXCHANGE } from '../types';

export interface SymbolConstraints {
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

export interface SymbolEntry {
  symbol: string;
  base: string;
  name: string;
  exchange: string;
  constraints: SymbolConstraints;
}

export interface SymbolFile {
  constraintsSyncedAt: string;
  symbols: SymbolEntry[];
}

export const SYMBOLS_FILE = fileURLToPath(new URL('./symbols.json', import.meta.url));

export function loadSymbolFile(): SymbolFile {
  const parsed = JSON.parse(readFileSync(SYMBOLS_FILE, 'utf8')) as SymbolFile;
  if (!Array.isArray(parsed.symbols) || parsed.symbols.length === 0) {
    throw new Error(`${SYMBOLS_FILE} contains no symbols`);
  }
  return parsed;
}

const file = loadSymbolFile();

export const TRACKED_SYMBOLS: SymbolEntry[] = file.symbols;
export const CONSTRAINTS_SYNCED_AT: string = file.constraintsSyncedAt;

const bySymbol = new Map(TRACKED_SYMBOLS.map(entry => [entry.symbol.toUpperCase(), entry]));

export function getSymbolEntry(symbol: string): SymbolEntry | undefined {
  return bySymbol.get(symbol.toUpperCase());
}

export function getSymbolExchange(symbol: string): string {
  return getSymbolEntry(symbol)?.exchange || FUTURES_EXCHANGE;
}

import { FUTURES_EXCHANGE } from '../types';
import { TRACKED_SYMBOLS } from './symbols';

export const TRADING_SYMBOLS: string[] = TRACKED_SYMBOLS.map(entry => entry.symbol);

export const FUTURES_EXCHANGE_ID = FUTURES_EXCHANGE;

export function isSupportedSymbol(symbol: string): boolean {
  return TRADING_SYMBOLS.includes(symbol.toUpperCase());
}

import { PerpetualFuturesSymbol, FUTURES_EXCHANGE } from '../types';

/**
 * Trading configuration for perpetual futures
 * Supports: BTCUSDT, ETHUSDT, SOLUSDT
 */

// export const TRADING_SYMBOLS: PerpetualFuturesSymbol[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];
export const TRADING_SYMBOLS: PerpetualFuturesSymbol[] = ['ETHUSDT'];

export const FUTURES_EXCHANGE_ID = FUTURES_EXCHANGE;

/**
 * Symbol metadata for trading
 */
export interface SymbolConfig {
  symbol: PerpetualFuturesSymbol;
  displayName: string;
  defaultLeverage: number;
  minOrderSize: number;
  pricePrecision: number;
  quantityPrecision: number;
}

/**
 * Default trading configuration for each symbol
 * Note: Update these values based on actual exchange requirements
 */
export const SYMBOL_CONFIGS: Record<PerpetualFuturesSymbol, SymbolConfig> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    displayName: 'Bitcoin Perpetual',
    defaultLeverage: 10,
    minOrderSize: 0.001, // Minimum BTC order size
    pricePrecision: 2,
    quantityPrecision: 3,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    displayName: 'Ethereum Perpetual',
    defaultLeverage: 10,
    minOrderSize: 0.01, // Minimum ETH order size
    pricePrecision: 2,
    quantityPrecision: 2,
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    displayName: 'Solana Perpetual',
    defaultLeverage: 10,
    minOrderSize: 0.1, // Minimum SOL order size
    pricePrecision: 3,
    quantityPrecision: 1,
  },
  BNBUSDT: {
    symbol: 'BNBUSDT',
    displayName: 'BNB Perpetual',
    defaultLeverage: 10,
    minOrderSize: 0.01,
    pricePrecision: 2,
    quantityPrecision: 2,
  },
  XRPUSDT: {
    symbol: 'XRPUSDT',
    displayName: 'XRP Perpetual',
    defaultLeverage: 10,
    minOrderSize: 1,
    pricePrecision: 5,
    quantityPrecision: 1,
  },
  DOGEUSDT: {
    symbol: 'DOGEUSDT',
    displayName: 'DOGE Perpetual',
    defaultLeverage: 10,
    minOrderSize: 1,
    pricePrecision: 6,
    quantityPrecision: 0,
  },
};

/**
 * Get configuration for a specific symbol
 */
export function getSymbolConfig(symbol: PerpetualFuturesSymbol): SymbolConfig {
  return SYMBOL_CONFIGS[symbol];
}

/**
 * Validate if a symbol is supported
 */
export function isSupportedSymbol(symbol: string): symbol is PerpetualFuturesSymbol {
  return TRADING_SYMBOLS.includes(symbol as PerpetualFuturesSymbol);
}


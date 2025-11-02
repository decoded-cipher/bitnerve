import { createFuturesOrder, getFuturesTicker } from './api';
import { CreateFuturesOrderParams, PerpetualFuturesSymbol, FUTURES_EXCHANGE } from '../../types';
import { getSymbolConfig } from '../../config/exchange';

/**
 * Place a market order (immediate execution)
 */
export async function placeMarketOrder(
  symbol: PerpetualFuturesSymbol,
  side: 'BUY' | 'SELL',
  quantity: number,
  reduceOnly: boolean = false
) {
  const config = getSymbolConfig(symbol);
  
  const params: CreateFuturesOrderParams = {
    exchange: FUTURES_EXCHANGE,
    symbol,
    side,
    order_type: 'MARKET',
    quantity: Number(quantity.toFixed(config.quantityPrecision)),
    reduce_only: reduceOnly,
  };
  
  return createFuturesOrder(params);
}

/**
 * Place a limit order
 */
export async function placeLimitOrder(
  symbol: PerpetualFuturesSymbol,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  timeInForce: 'GTC' | 'IOC' | 'FOK' = 'GTC',
  reduceOnly: boolean = false
) {
  const config = getSymbolConfig(symbol);
  
  const params: CreateFuturesOrderParams = {
    exchange: FUTURES_EXCHANGE,
    symbol,
    side,
    order_type: 'LIMIT',
    quantity: Number(quantity.toFixed(config.quantityPrecision)),
    price: Number(price.toFixed(config.pricePrecision)),
    time_in_force: timeInForce,
    reduce_only: reduceOnly,
  };
  
  return createFuturesOrder(params);
}

/**
 * Place a stop loss order (stop market)
 */
export async function placeStopLossOrder(
  symbol: PerpetualFuturesSymbol,
  side: 'BUY' | 'SELL',
  quantity: number,
  stopPrice: number,
  reduceOnly: boolean = true
) {
  const config = getSymbolConfig(symbol);
  
  const params: CreateFuturesOrderParams = {
    exchange: FUTURES_EXCHANGE,
    symbol,
    side,
    order_type: 'STOP_MARKET',
    quantity: Number(quantity.toFixed(config.quantityPrecision)),
    stop_price: Number(stopPrice.toFixed(config.pricePrecision)),
    reduce_only: reduceOnly,
  };
  
  return createFuturesOrder(params);
}

/**
 * Format quantity according to symbol precision
 */
export function formatQuantity(symbol: PerpetualFuturesSymbol, quantity: number): number {
  const config = getSymbolConfig(symbol);
  return Number(quantity.toFixed(config.quantityPrecision));
}

/**
 * Format price according to symbol precision
 */
export function formatPrice(symbol: PerpetualFuturesSymbol, price: number): number {
  const config = getSymbolConfig(symbol);
  return Number(price.toFixed(config.pricePrecision));
}


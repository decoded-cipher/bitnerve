
import {
  createFuturesOrder,
  getFuturesTicker,
  // getFuturesOrderBook,
} from '../api.js';

import {
  CreateFuturesOrderParams,
  PerpetualFuturesSymbol,
  FUTURES_EXCHANGE,
} from '../types.js';
import { getSymbolConfig } from '../config/trading.js';



/**
 * Calculate mid price from order book
 * Mid price = (best_bid + best_ask) / 2
 */
// export async function getMidPrice(symbol: PerpetualFuturesSymbol): Promise<number | null> {
//   try {
//     const orderBook = await getFuturesOrderBook({
//       symbol,
//       exchange: FUTURES_EXCHANGE,
//       limit: 1,
//     });
    
//     if (orderBook?.bids?.[0] && orderBook?.asks?.[0]) {
//       const bestBid = parseFloat(orderBook.bids[0][0] || orderBook.bids[0].price);
//       const bestAsk = parseFloat(orderBook.asks[0][0] || orderBook.asks[0].price);
//       return (bestBid + bestAsk) / 2;
//     }
//     return null;
//   } catch (error) {
//     console.error(`Error getting mid price for ${symbol}:`, error);
//     return null;
//   }
// }

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
 * Get market data for all trading symbols
 */
export async function getAllMarketData() {
  const symbols: PerpetualFuturesSymbol[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  const results = await Promise.allSettled(
    symbols.map(symbol => 
      getFuturesTicker({
        symbol,
        exchange: FUTURES_EXCHANGE,
      }).then(data => ({ symbol, data }))
    )
  );
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { symbol: 'unknown', error: result.reason };
  });
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


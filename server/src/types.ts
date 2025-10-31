/**
 * API Response Types
 */

export interface ServerTimeResponse {
  serverTime?: number;
  [key: string]: any;
}

/**
 * Parameters for candles API request
 */
export interface CandlesParams {
  start_time: string | number;
  end_time: string | number;
  symbol: string;
  interval: string | number;
  exchange: string;
}

/**
 * Parameters for orders API request
 */
export interface OrdersParams extends Record<string, string | number | boolean> {
  count?: number;
  from_time?: number;
  to_time?: number;
  side?: 'buy' | 'sell';
  symbols?: string;
  exchanges?: string;
  type?: 'limit' | 'market';
  open?: boolean;
}


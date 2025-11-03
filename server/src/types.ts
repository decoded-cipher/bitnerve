
// Base params for most API calls (exchange + symbol pattern)
export interface BaseApiParams {
  exchange: string;
  symbol?: string;
  [key: string]: any;
}

// Parameters for fetching candlestick data
export interface CandlesParams {
  start_time: string | number;
  end_time: string | number;
  symbol: string;
  interval: string | number;
  exchange?: string;
}

// Parameters for creating futures order (keep specific for order types)
export interface CreateFuturesOrderParams {
  exchange: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stop_price?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  reduce_only?: boolean;
  close_on_trigger?: boolean;
  [key: string]: any;
}

// Trading symbols for perpetual futures
export type PerpetualFuturesSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'BNBUSDT' | 'XRPUSDT' | 'DOGEUSDT';

// Exchange identifier for CoinSwitch futures
export const FUTURES_EXCHANGE = 'EXCHANGE_2';





export interface AccountSummary {
  balance: any;
  portfolio: any;
  positions: any;
}

export interface AccountMetrics {
  availableCash: number;
  cryptoValue: number;
  accountValue: number;
  positions: any[];
}

export interface PerformanceMetrics {
  initialBalance: number;
  totalReturnPercent: number;
  sharpeRatio: number;
}

export interface AccountData {
  accountSummary: AccountSummary;
  closedOrders: any[];
}

export interface SessionState {
  startTime: number;
  invocationCount: number;
  initialBalance?: number;
}

export interface MarketData {
  symbol: string;
  data: any;
}


export interface Metrics {
  totalReturnPercent: number;
  availableCash: number;
  accountValue: number;
  positions: any;
  sharpeRatio?: number;
}
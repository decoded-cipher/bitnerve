
export interface ServerTimeResponse {
  serverTime?: number;
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

// Parameters for fetching futures positions
export interface FuturesPositionsParams extends Record<string, string | number | boolean> {
  exchange: string;
  symbol: string;
}

// Parameters for listing positions (DMS API v5)
export interface PositionListParams extends Record<string, string | number | boolean | undefined> {
  symbol?: string;
  category: string;
}

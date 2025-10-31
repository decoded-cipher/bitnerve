
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
  exchange: string;
}

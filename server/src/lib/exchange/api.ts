
import axios from 'axios';
import { sign, etc } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2';
import { concatBytes } from '@noble/hashes/utils';
import type { CandlesParams, BaseApiParams, CreateFuturesOrderParams } from '../../types';

const BASE_URL = process.env.COINSWITCH_BASE_URL;
const DMS_URL = process.env.COINSWITCH_DMS_URL;
const SECRET_KEY = process.env.COINSWITCH_SECRET_KEY!;
const API_KEY = process.env.COINSWITCH_API_KEY!;

// Extend etc with sha512Sync method
etc.sha512Sync = (...m: Uint8Array[]) => sha512(concatBytes(...m));



// Get server time from CoinSwitch API
async function getServerTime(): Promise<number> {
  try {
    const { data } = await axios.get(`${BASE_URL}/trade/api/v2/time`);
    return data.serverTime ?? Date.now();
  } catch {
    return Date.now();
  }
}


// Generate signature for authenticated requests
async function generateSignature(
  method: string,
  endpoint: string,
  epochTime: string
): Promise<string> {
  const message = method + decodeURIComponent(endpoint.replace(/\+/g, ' ')) + epochTime;
  const signature = await sign(Buffer.from(message, 'utf-8'), Buffer.from(SECRET_KEY, 'hex'));
  return Buffer.from(signature).toString('hex');
}


// Wrapper for authenticated requests
async function useAuthRequest(
  endpoint: string,
  method: string = 'GET',
  params: Record<string, string | number | boolean> = {},
  useServerTime: boolean = true,
  baseUrl?: string
): Promise<any> {
  
  const epochTime = String(useServerTime ? await getServerTime() : Date.now());
  const url = new URL(endpoint, baseUrl || BASE_URL);

  if (method === 'GET' && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  const fullPath = url.pathname + url.search;
  const unquoteEndpoint = decodeURIComponent(fullPath.replace(/\+/g, ' '));

  const signature = await generateSignature(method, unquoteEndpoint, epochTime);

  const response = await axios({
    method,
    url: url.toString(),
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-SIGNATURE': signature,
      'X-AUTH-APIKEY': API_KEY,
      'X-AUTH-EPOCH': epochTime,
    },
    data: method !== 'GET' ? params : undefined,
  });

  return response.data;
}


// Ping API to test connectivity
export async function pingApi() {
  return useAuthRequest('/trade/api/v2/ping', 'GET');
}


// Fetch klines data from CoinSwitch API
export async function getKlinesData(params: CandlesParams) {
  const response = await useAuthRequest('/trade/api/v2/futures/klines', 'GET', { ...params, exchange: 'EXCHANGE_2' });
  return response.data;
}

// Fetch futures positions from CoinSwitch API
export async function getFuturesPositions(params: BaseApiParams) {
  return useAuthRequest('/trade/api/v2/futures/positions', 'GET', params);
}

// Get wallet balance from CoinSwitch API
export async function getWalletBalance() {
  return useAuthRequest('/trade/api/v2/futures/wallet_balance', 'GET');
}

// Get user portfolio from CoinSwitch API
export async function getUserPortfolio() {
  return useAuthRequest('/trade/api/v2/user/portfolio', 'GET');
}

// Fetch a specific order by order ID from CoinSwitch API
export async function getOrder(params: any) {
  return useAuthRequest('/trade/api/v2/futures/order', 'GET', params);
}

// Fetch closed orders from CoinSwitch API (POST request)
export async function getClosedOrders(params: any) {
  return useAuthRequest('/trade/api/v2/futures/orders/closed', 'POST', params);
}

// Create futures order (Place Order)
export async function createFuturesOrder(params: CreateFuturesOrderParams) {
  return useAuthRequest('/trade/api/v2/futures/order', 'POST', params);
}

// Cancel futures order
export async function cancelFuturesOrder(params: any) {
  return useAuthRequest('/trade/api/v2/futures/order', 'DELETE', params);
}

// Get futures ticker (includes open interest and funding rate)
export async function getFuturesTicker(params: BaseApiParams) {
  return useAuthRequest('/trade/api/v2/futures/ticker', 'GET', params);
}

// // Get futures order book (depth)
// export async function getFuturesOrderBook(params: any) {
//   return useAuthRequest('/trade/api/v2/futures/orderbook', 'GET', params);
// }

// // Get futures L2 order book (aggregated depth)
// export async function getFuturesL2OrderBook(params: any) {
//   return useAuthRequest('/trade/api/v2/futures/l2orderbook', 'GET', params);
// }

// // Get leverage information
// export async function getLeverage(params: any) {
//   return useAuthRequest('/trade/api/v2/futures/leverage', 'GET', params);
// }

// // Set leverage
// export async function setLeverage(params: any) {
//   return useAuthRequest('/trade/api/v2/futures/leverage', 'POST', params);
// }

// // Get open orders
// export async function getOpenOrders(params: any) {
//   return useAuthRequest('/trade/api/v2/futures/orders', 'GET', params);
// }

// Cancel all open orders for a specific exchange
export async function cancelAllFuturesOrders(params: any) {
  return useAuthRequest('/trade/api/v2/futures/cancel_all', 'POST', params);
}

// Get futures instrument info
export async function getFuturesInstrumentInfo(params: any) {
  return useAuthRequest('/trade/api/v2/futures/instrument_info', 'GET', params);
}


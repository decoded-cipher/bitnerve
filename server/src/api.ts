
import axios from 'axios';
import { sign, etc } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2';
import { concatBytes } from '@noble/hashes/utils';

import type { ServerTimeResponse, CandlesParams } from './types.js';

const BASE_URL = process.env.COINSWITCH_BASE_URL;
const SECRET_KEY = process.env.COINSWITCH_SECRET_KEY!;
const API_KEY = process.env.COINSWITCH_API_KEY!;

// Extend etc with sha512Sync method
etc.sha512Sync = (...m: Uint8Array[]) => sha512(concatBytes(...m));



// Get server time from CoinSwitch API
async function getServerTime(): Promise<number> {
  try {
    const { data } = await axios.get<ServerTimeResponse>(`${BASE_URL}/trade/api/v2/time`);
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
  useServerTime: boolean = true
): Promise<any> {
  
  const epochTime = String(useServerTime ? await getServerTime() : Date.now());
  const url = new URL(endpoint, BASE_URL);

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


// Fetch candles data from CoinSwitch API
export async function getCandles(params: CandlesParams) {
  return useAuthRequest('/trade/api/v2/candles', 'GET', { ...params });
}


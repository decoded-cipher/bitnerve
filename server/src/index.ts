
import { getCandles } from './api.js';

(async () => {
  const params = {
    end_time: new Date().getTime().toString(),  // current time
    start_time: new Date(Date.now() - 60 * 60 * 1000).getTime().toString(), // 1 hour ago
    symbol: 'SOL/INR',
    interval: '60',
    exchange: 'coinswitchx',
  };

  try {
    const candlesData = await getCandles(params);
    console.log('Candles Data:', candlesData);
  } catch (error) {
    console.error('Error fetching candles data:', error);
  }
})();

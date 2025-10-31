
import { getCandles } from './api.js';
import { formatToHumanReadableData } from './utils.js';

(async () => {
  const params = {
    start_time: new Date(Date.now() - 60 * 60 * 1000).getTime().toString(), // 1 hour ago
    end_time: new Date().getTime().toString(),
    symbol: 'SOL/INR',
    interval: '5',
    exchange: 'coinswitchx',
  };

  try {
    const candlesData = await getCandles(params);
    console.table(formatToHumanReadableData(candlesData.data));
  } catch (error) {
    console.error('Error fetching candles data:', error);
  }
  
  process.exit(0);
})();


import { calcMidPrice, calculateSMA, calculateEMA, calculateMACD } from './helpers/indicators.js';
import { getCandleData } from './api.js';
import { CandlesParams } from './types.js';
import { formatToHumanReadableData } from './utils.js';


(async () => {
  try {

    const params = {
      start_time: Date.now() - (1000 * 60 * 60 * 24), // 24 hours ago
      end_time: Date.now(),
      symbol: 'SOL/INR',
      interval: '5'
    } as CandlesParams;

    const candlesData = await getCandleData(params);
    console.table(formatToHumanReadableData(candlesData.data));
    console.log('Total Candles fetched:', candlesData.data.length);

    const midPrices = calcMidPrice(candlesData.data.splice(-50)); // Calculate Mid Prices for last 50 candles
    console.log('Mid Prices:', midPrices);
    console.log('Total Mid Prices fetched:', midPrices.length);

    const ema20 = calculateEMA(midPrices, 20); // Calculate 20-period EMA on Mid Prices
    console.log('EMA 20:', ema20);
    console.log('Total EMA 20 values fetched:', ema20.length);

    const macd = calculateMACD(midPrices);
    console.log('MACD:', macd);
    console.log('Total MACD values fetched:', macd.length);

  } catch (error) {
    console.error('Error fetching candles data:', error);
  }
  
  process.exit(0);
})();

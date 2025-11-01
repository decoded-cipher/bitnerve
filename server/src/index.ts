
import { calcMidPrice, calculateSMA, calculateEMA, calculateMACD } from './helpers/indicators.js';
import { getCandleData, pingApi } from './api.js';
import { CandlesParams } from './types.js';
import { formatToHumanReadableData } from './utils.js';


async function getIndicators(duration: number, symbol: string) {
  const params = {
    start_time: Date.now() - (1000 * 60 * 60 * (duration === 5 ? 12 : 24 * 10)), // 12 hours for 5min, 10 days for 4hr
    end_time: Date.now(),
    symbol: symbol,
    interval: duration,
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

  return {
    midPrices,
    ema20,
    macd
  };
}


(async () => {
  try {

    // Test API connectivity
    // const pingResponse = await pingApi();
    // console.log('Ping response:', pingResponse);

    await getIndicators(5, 'SOL/INR');
    // await getIndicators(240, 'SOL/INR');

  } catch (error) {
    console.error('Error in main execution:', error);
  }
  process.exit(0);
})();

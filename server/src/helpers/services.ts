import { getKlinesData } from "../api";
import { CandlesParams } from "../types";
import { formatToHumanReadableData } from "./utils";
import { calcMidPrice, calculateEMA, calculateMACD } from "./indicators";


export async function getIndicators(duration: number, symbol: string) {
  const params = {
    start_time: Date.now() - (1000 * 60 * 60 * (duration === 5 ? 5 : 24 * 10)), // Last 5 hours or 10 days
    end_time: Date.now(),
    symbol: symbol,
    interval: duration,
  } as CandlesParams;

  const candlesData = await getKlinesData(params);
  console.table(formatToHumanReadableData(candlesData));
  console.log('Total Candles fetched:', candlesData.length);

  const midPrices = calcMidPrice(candlesData.splice(-50)); // Calculate Mid Prices for last 50 candles
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

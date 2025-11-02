
import { getKlinesData, getFuturesPositions, getUserPortfolio, getWalletBalance, getFuturesTicker } from "../api.js";
import { FUTURES_EXCHANGE, BaseApiParams, PerpetualFuturesSymbol, CandlesParams } from "../types.js";
import { calcMidPrice, calculateEMA, calculateMACD, calculateRSI, calculateATR, calculateVolumeData } from "./indicators.js";
import { formatToHumanReadableData } from "./utils.js";



export async function getIndicators(duration: number, symbol: string) {
  const params = {
    start_time: Date.now() - (1000 * 60 * 60 * (duration === 5 ? 5 : 24 * 10)), // Last 5 hours or 10 days
    end_time: Date.now(),
    symbol: symbol,
    interval: duration,
  } as CandlesParams;

  const candlesData = await getKlinesData(params);
  const recentCandles = candlesData.slice(-50);
  
  // console.table(formatToHumanReadableData(candlesData));
  
  const midPrices = calcMidPrice(recentCandles);
  const ema20 = calculateEMA(midPrices, 20);
  const ema50 = calculateEMA(midPrices, 50);
  const macd = calculateMACD(midPrices);
  const rsi7 = calculateRSI(midPrices, 7);
  const rsi14 = calculateRSI(midPrices, 14);
  const atr3 = calculateATR(recentCandles, 3);
  const atr14 = calculateATR(recentCandles, 14);
  const volumeData = calculateVolumeData(recentCandles);

  return {
    midPrices,
    ema20,
    ema50,
    macd,
    rsi7,
    rsi14,
    atr3,
    atr14,
    volumeData
  };
}



export async function getAccountSummary() {
  const params: BaseApiParams = {
    exchange: FUTURES_EXCHANGE,
  };

  const [balance, portfolio, positions] = await Promise.all([
    getWalletBalance(),
    getUserPortfolio(),
    getFuturesPositions(params),
  ]);

  return { balance, portfolio, positions };
}



/**
 * Get Open Interest and Funding Rate from futures ticker
 */
export async function getOpenInterestAndFundingRate(symbol: string) {
  try {
    const tickerData = await getFuturesTicker({
      symbol,
      exchange: FUTURES_EXCHANGE,
    });
    
    // Handle different possible response structures
    const data = tickerData?.data || tickerData;
    
    return {
      openInterest: {
        latest: data?.open_interest || data?.openInterest || 0,
        average: data?.avg_open_interest || data?.avgOpenInterest || data?.average_open_interest || 0,
      },
      fundingRate: data?.funding_rate || data?.fundingRate || 0,
      currentPrice: data?.last_price || data?.lastPrice || data?.price || 0,
    };
  } catch (error) {
    console.error('Error fetching OI and Funding Rate:', error);
    return {
      openInterest: { latest: 0, average: 0 },
      fundingRate: 0,
      currentPrice: 0,
    };
  }
}



/**
 * Get comprehensive market data for a symbol (combines indicators + OI + Funding)
 * @params:
 *   symbol - Trading symbol (e.g., 'SOLUSDT')
 *   duration - Duration in minutes for intraday data (e.g., 3 for 3-minute intervals)
 * @returns: Object with intraday indicators, 4h indicators, OI, and funding rate
 */
export async function getComprehensiveMarketData(symbol: string, duration: number = 3) {
  const [intradayIndicators, longerTermIndicators, oiData] = await Promise.all([
    getIndicators(duration, symbol),           // Intraday data (3-minute intervals)
    getIndicators(240, symbol),                 // 4-hour intervals (240 minutes)
    getOpenInterestAndFundingRate(symbol),
  ]);

  return {
    // Current/latest values from intraday
    currentPrice: oiData.currentPrice,
    currentEma20: intradayIndicators.ema20[intradayIndicators.ema20.length - 1],
    currentMacd: intradayIndicators.macd[intradayIndicators.macd.length - 1],
    currentRsi7: intradayIndicators.rsi7[intradayIndicators.rsi7.length - 1],
    
    // Intraday series (3-minute intervals)
    intraday: {
      midPrices: intradayIndicators.midPrices,
      ema20: intradayIndicators.ema20,
      macd: intradayIndicators.macd,
      rsi7: intradayIndicators.rsi7,
      rsi14: intradayIndicators.rsi14,
    },
    
    // Longer-term context (4-hour timeframe)
    longerTerm: {
      ema20: longerTermIndicators.ema20,
      ema50: longerTermIndicators.ema50,
      atr3: longerTermIndicators.atr3,
      atr14: longerTermIndicators.atr14,
      macd: longerTermIndicators.macd,
      rsi14: longerTermIndicators.rsi14,
      volumeData: longerTermIndicators.volumeData,
    },
    
    // Open Interest and Funding Rate
    openInterest: oiData.openInterest,
    fundingRate: oiData.fundingRate,
  };
}



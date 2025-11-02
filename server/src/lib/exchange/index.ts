import { getKlinesData, getFuturesTicker } from './api';
import { FUTURES_EXCHANGE, CandlesParams } from '../../types';
import { calcMidPrice, calculateEMA, calculateMACD, calculateRSI, calculateATR, calculateVolumeData } from './indicators';
import { TRADING_SYMBOLS } from '../../config/exchange';

/**
 * Get technical indicators for a symbol
 */
export async function getIndicators(duration: number, symbol: string) {
  const params = {
    start_time: Date.now() - (1000 * 60 * 60 * (duration === 5 ? 5 : 24 * 10)), // Last 5 hours or 10 days
    end_time: Date.now(),
    symbol: symbol,
    interval: duration,
  } as CandlesParams;

  const candlesData = await getKlinesData(params);
  const recentCandles = candlesData.slice(-50);
  
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
 */
export async function getComprehensiveMarketData(symbol: string, duration: number = 5) {
  const [intradayIndicators, longerTermIndicators, oiData] = await Promise.all([
    getIndicators(duration, symbol),           // Intraday data (5-minute intervals)
    getIndicators(240, symbol),                // 4-hour intervals (240 minutes)
    getOpenInterestAndFundingRate(symbol),
  ]);

  return {
    // Current/latest values from intraday
    currentPrice: oiData.currentPrice,
    currentEma20: intradayIndicators.ema20[intradayIndicators.ema20.length - 1],
    currentMacd: intradayIndicators.macd[intradayIndicators.macd.length - 1],
    currentRsi7: intradayIndicators.rsi7[intradayIndicators.rsi7.length - 1],
    
    // Intraday series
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

/**
 * Market data for a single symbol
 */
export interface MarketData {
  symbol: string;
  data: Awaited<ReturnType<typeof getComprehensiveMarketData>>;
}

/**
 * Fetch all market data for all trading symbols in parallel
 */
export async function fetchAllMarketData(): Promise<MarketData[]> {
  const allMarketData = await Promise.all(
    TRADING_SYMBOLS.map(async (symbol) => ({
      symbol,
      data: await getComprehensiveMarketData(symbol, 5),
    }))
  );
  
  return allMarketData;
}


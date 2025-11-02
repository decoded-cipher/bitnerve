
import { getKlinesData, getFuturesTicker } from './api';
import { FUTURES_EXCHANGE, CandlesParams, MarketData } from '../../types';
import { calcMidPrice, calcEMA, calcMACD, calcRSI, calcATR, calcVolume } from './indicators';
import { TRADING_SYMBOLS } from '../../config/exchange';



// Fetch technical indicators for a given duration and symbol
async function fetchIndicators(duration: number, symbol: string) {
  const params = {
    start_time: Date.now() - (1000 * 60 * 60 * (duration === 5 ? 5 : 24 * 10)), // Last 5 hours or 10 days
    end_time: Date.now(),
    symbol: symbol,
    interval: duration,
  } as CandlesParams;

  const candlesData = await getKlinesData(params);
  const recentCandles = candlesData.slice(-50);
  
  const midPrices = calcMidPrice(recentCandles);
  const ema20 = calcEMA(midPrices, 20);
  const ema50 = calcEMA(midPrices, 50);
  const macd = calcMACD(midPrices);
  const rsi7 = calcRSI(midPrices, 7);
  const rsi14 = calcRSI(midPrices, 14);
  const atr3 = calcATR(recentCandles, 3);
  const atr14 = calcATR(recentCandles, 14);
  const volumeData = calcVolume(recentCandles);

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



// Fetch Open Interest and Funding Rate for a symbol
async function fetchOIAndFunding(symbol: string) {
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



// Orchestrator to get all market data for a symbol
async function getMarketData(symbol: string, duration: number = 5) {
  const [intradayIndicators, longerTermIndicators, oiData] = await Promise.all([
    fetchIndicators(duration, symbol),           // Intraday data (5-minute intervals)
    fetchIndicators(240, symbol),                // 4-hour intervals (240 minutes)
    fetchOIAndFunding(symbol),
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



// Fetch market data for all trading symbols
export async function fetchMarketData(): Promise<MarketData[]> {
  const allMarketData = await Promise.all(
    TRADING_SYMBOLS.map(async (symbol) => ({
      symbol,
      data: await getMarketData(symbol, 5),
    }))
  );
  
  return allMarketData;
}


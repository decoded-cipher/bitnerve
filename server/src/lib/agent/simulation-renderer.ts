
import { SessionState, MarketData } from '../../types';
import { PROMPT, formatCoinData } from './prompt';
import { formatArray, formatTimestampToIST, calcDuration } from '../utils';
import { fetchMarketData } from '../exchange';
import { getAccountMetrics } from '../exchange/helper';

// Generate placeholder replacements for each coin's market data
function getCoinReplacements(marketData: MarketData[]): string {
  return marketData
    .map(({ symbol, data }) => {
      const coinName = symbol.replace('USDT', '');
      const coinUpper = coinName.toUpperCase();
      let template = formatCoinData(coinName, {});
      
      const replacements = new Map<string, string>([
        [`{{${coinUpper}_CURRENT_PRICE}}`, String(data.currentPrice)],
        [`{{${coinUpper}_CURRENT_EMA20}}`, String(data.currentEma20)],
        [`{{${coinUpper}_CURRENT_MACD}}`, String(data.currentMacd)],
        [`{{${coinUpper}_CURRENT_RSI7}}`, String(data.currentRsi7)],
        [`{{${coinUpper}_OI_LATEST}}`, String(data.openInterest)],
        [`{{${coinUpper}_FUNDING_RATE}}`, String(data.fundingRate)],
        [`{{${coinUpper}_MID_PRICES}}`, formatArray(data.intraday.midPrices)],
        [`{{${coinUpper}_EMA20}}`, formatArray(data.intraday.ema20)],
        [`{{${coinUpper}_MACD}}`, formatArray(data.intraday.macd)],
        [`{{${coinUpper}_RSI7}}`, formatArray(data.intraday.rsi7)],
        [`{{${coinUpper}_RSI14}}`, formatArray(data.intraday.rsi14)],
        [`{{${coinUpper}_EMA20_4H}}`, String(data.longerTerm.ema20[data.longerTerm.ema20.length - 1])],
        [`{{${coinUpper}_EMA50_4H}}`, String(data.longerTerm.ema50[data.longerTerm.ema50.length - 1])],
        [`{{${coinUpper}_ATR3}}`, String(data.longerTerm.atr3[data.longerTerm.atr3.length - 1])],
        [`{{${coinUpper}_ATR14}}`, String(data.longerTerm.atr14[data.longerTerm.atr14.length - 1])],
        [`{{${coinUpper}_VOLUME_CURRENT}}`, String(data.longerTerm.volumeData.currentVolume)],
        [`{{${coinUpper}_VOLUME_AVG}}`, String(data.longerTerm.volumeData.averageVolume)],
        [`{{${coinUpper}_MACD_4H}}`, formatArray(data.longerTerm.macd)],
        [`{{${coinUpper}_RSI14_4H}}`, formatArray(data.longerTerm.rsi14)],
      ]);
      
      replacements.forEach((value, placeholder) => {
        template = template.replaceAll(placeholder, value);
      });
      
      return template;
    })
    .join('\n\n');
}

// Create placeholder replacements for account-related data
function getAccountReplacements(params: {
  minutesTrading: number;
  currentTime: string;
  invocationCount: number;
  coinDataSections: string;
  totalReturnPercent: number;
  availableCash: number;
  accountValue: number;
  positions?: string;
  sharpeRatio?: number;
}): Map<string, string> {
  const replacements = new Map<string, string>([
    ['{{MINUTES_TRADING}}', String(params.minutesTrading)],
    ['{{CURRENT_TIME}}', params.currentTime],
    ['{{INVOCATION_COUNT}}', String(params.invocationCount)],
    ['{{COIN_DATA}}', params.coinDataSections],
    ['{{TOTAL_RETURN_PERCENT}}', params.totalReturnPercent.toFixed(2)],
    ['{{AVAILABLE_CASH}}', params.availableCash.toFixed(2)],
    ['{{ACCOUNT_VALUE}}', params.accountValue.toFixed(2)],
  ]);

  if (params.positions !== undefined) {
    replacements.set('{{POSITIONS}}', params.positions);
  }

  if (params.sharpeRatio !== undefined) {
    replacements.set('{{SHARPE_RATIO}}', params.sharpeRatio.toFixed(3));
  }

  return replacements;
}

// Replace all placeholders in a template string using the provided replacements map
function replace(template: string, replacements: Map<string, string>): string {
  let result = template;
  replacements.forEach((value, placeholder) => {
    result = result.replaceAll(placeholder, value);
  });
  return result;
}

/**
 * Get user prompt for simulation trading with database account data
 */
export async function getUserPrompt(accountId: string, sessionState?: SessionState): Promise<string> {
  // Fetch market data from real exchange and account metrics from simulation database
  const [marketData, accountMetrics] = await Promise.all([
    fetchMarketData(),
    getAccountMetrics(accountId),
  ]);
  
  // Generate coin data sections
  const coinDataSections = getCoinReplacements(marketData);
  
  // Prepare session info
  const currentTime = formatTimestampToIST(Date.now());
  const minutesTrading = calcDuration(sessionState?.startTime ?? 0, Date.now(), 'm');
  const invocationCount = sessionState?.invocationCount || 0;
  
  // Create placeholder replacements
  const replacements = getAccountReplacements({
    minutesTrading,
    currentTime,
    invocationCount,
    coinDataSections,
    totalReturnPercent: accountMetrics.totalReturnPercent,
    availableCash: accountMetrics.availableCash,
    accountValue: accountMetrics.accountValue,
    positions: JSON.stringify(accountMetrics.positions),
    sharpeRatio: accountMetrics.sharpeRatio,
  });
  
  // Apply all replacements to the prompt template
  return replace(PROMPT.USER, replacements);
}


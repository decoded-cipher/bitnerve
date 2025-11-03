
import { SessionState, MarketData, Metrics } from '../../types';
import { PROMPT, formatCoinData } from './prompt';
import { formatArray, formatTimestampToIST, calcDuration } from '../utils';
import { fetchMarketData } from '../exchange';
import { fetchAccountData, getAccountMetrics, calcPerformanceMetrics } from '../exchange/_account';
import { getAccountMetrics as getSimulationAccountMetrics } from '../exchange/helper';


// Formats data for all coins into a single string
function formatAllCoins(marketData: MarketData[]): string {
  return marketData
    .map(({ symbol, data }) => {
      const coinName = symbol.replace('USDT', '');
      const coinUpper = coinName.toUpperCase();
      const template = formatCoinData(coinName, {});
      
      const replacements = [
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
      ];
      
      return replacements.reduce(
        (acc, [placeholder, value]) => acc.replaceAll(placeholder, value),
        template
      );
    })
    .join('\n\n');
}


// Fetches metrics based on whether it's live or simulation trading
async function fetchMetrics(accountId?: string, initialBalance?: number): Promise<Metrics> {
  if (accountId) {
    const metrics = await getSimulationAccountMetrics(accountId);
    return {
      totalReturnPercent: metrics.totalReturnPercent,
      availableCash: metrics.availableCash,
      accountValue: metrics.accountValue,
      positions: metrics.positions,
      sharpeRatio: metrics.sharpeRatio,
    };
  }
  
  const accountData = await fetchAccountData();
  const accountMetrics = getAccountMetrics(accountData);
  const performanceMetrics = calcPerformanceMetrics(accountMetrics, accountData, initialBalance);
  
  return {
    totalReturnPercent: performanceMetrics.totalReturnPercent,
    availableCash: accountMetrics.availableCash,
    accountValue: accountMetrics.accountValue,
    positions: accountMetrics.positions,
    sharpeRatio: performanceMetrics.sharpeRatio,
  };
}


// Builds the user prompt by replacing placeholders with actual data
function buildPrompt(metrics: Metrics, coinData: string, sessionState?: SessionState): string {
  const replacements = new Map<string, string>([
    ['{{MINUTES_TRADING}}', String(calcDuration(sessionState?.startTime ?? 0, Date.now(), 'm'))],
    ['{{CURRENT_TIME}}', formatTimestampToIST(Date.now())],
    ['{{INVOCATION_COUNT}}', String(sessionState?.invocationCount || 0)],
    ['{{COIN_DATA}}', coinData],
    ['{{TOTAL_RETURN_PERCENT}}', metrics.totalReturnPercent.toFixed(2)],
    ['{{AVAILABLE_CASH}}', metrics.availableCash.toFixed(2)],
    ['{{ACCOUNT_VALUE}}', metrics.accountValue.toFixed(2)],
    ['{{POSITIONS}}', JSON.stringify(metrics.positions)],
  ]);

  if (metrics.sharpeRatio !== undefined) {
    replacements.set('{{SHARPE_RATIO}}', metrics.sharpeRatio.toFixed(3));
  }

  return Array.from(replacements.entries()).reduce(
    (template, [placeholder, value]) => template.replaceAll(placeholder, value),
    PROMPT.USER
  );
}


// Orchestrates fetching data and rendering the user prompt
export async function getUserPrompt(
  sessionState?: SessionState,
  accountId?: string
): Promise<string> {
  const [marketData, metrics] = await Promise.all([
    fetchMarketData(),
    fetchMetrics(accountId, sessionState?.initialBalance),
  ]);

  return buildPrompt(metrics, formatAllCoins(marketData), sessionState);
}


import { PROMPT, formatCoinData } from './prompt';
import { formatTimestampToIST } from '../utils';
import { fetchAllMarketData, MarketData } from '../exchange';
import { fetchAccountData, extractAccountMetrics, calculatePerformanceMetrics, AccountData } from '../exchange/_account';

/**
 * Interface for session tracking
 */
export interface SessionState {
  startTime: number;
  invocationCount: number;
  initialBalance?: number; // Optional: stored when session starts
}

/**
 * Calculate session duration in minutes
 */
function calculateSessionDuration(sessionState?: SessionState): number {
  if (!sessionState) return 0;
  return Math.floor((Date.now() - sessionState.startTime) / (1000 * 60));
}

/**
 * Helper to format array data for display
 */
function formatArray(arr: number[], maxDisplay: number = 10): string {
  const displayArr = arr.length > maxDisplay ? arr.slice(-maxDisplay) : arr;
  return `[${displayArr.join(', ')}]`;
}

/**
 * Create placeholder replacement map for a single coin
 */
function createCoinReplacements(symbol: string, data: MarketData['data']): Map<string, string> {
  const coinName = symbol.replace('USDT', '');
  const coinUpper = coinName.toUpperCase();
  
  const replacements = new Map<string, string>([
    [`{{${coinUpper}_CURRENT_PRICE}}`, String(data.currentPrice)],
    [`{{${coinUpper}_CURRENT_EMA20}}`, String(data.currentEma20)],
    [`{{${coinUpper}_CURRENT_MACD}}`, String(data.currentMacd)],
    [`{{${coinUpper}_CURRENT_RSI7}}`, String(data.currentRsi7)],
    [`{{${coinUpper}_OI_LATEST}}`, String(data.openInterest.latest)],
    [`{{${coinUpper}_OI_AVG}}`, String(data.openInterest.average)],
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
  
  return replacements;
}

/**
 * Render coin data template with actual values
 */
function renderCoinDataSection(symbol: string, data: MarketData['data']): string {
  const coinName = symbol.replace('USDT', '');
  let template = formatCoinData(coinName, {});
  
  // Get all replacements for this coin
  const replacements = createCoinReplacements(symbol, data);
  
  // Apply all replacements
  replacements.forEach((value, placeholder) => {
    template = template.replaceAll(placeholder, value);
  });
  
  return template;
}

/**
 * Render all coin data sections
 */
function renderAllCoinDataSections(marketData: MarketData[]): string {
  return marketData
    .map(({ symbol, data }) => renderCoinDataSection(symbol, data))
    .join('\n\n');
}

/**
 * Create placeholder replacement map for account and session data
 */
function createAccountReplacements(params: {
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

/**
 * Apply all placeholder replacements to a template string
 */
function applyReplacements(template: string, replacements: Map<string, string>): string {
  let result = template;
  replacements.forEach((value, placeholder) => {
    result = result.replaceAll(placeholder, value);
  });
  return result;
}

/**
 * Format positions data for display (optional, currently not used in prompt)
 */
export function formatPositions(positions: any[]): string {
  if (!positions || positions.length === 0) return '[]';
  
  return positions.map(pos => {
    return JSON.stringify({
      symbol: pos.symbol,
      quantity: pos.quantity,
      entry_price: pos.entry_price,
      current_price: pos.current_price,
      liquidation_price: pos.liquidation_price,
      unrealized_pnl: pos.unrealized_pnl,
      leverage: pos.leverage,
      exit_plan: pos.exit_plan,
      confidence: pos.confidence,
      risk_usd: pos.risk_usd,
    });
  }).join(' ');
}

/**
 * Render full user prompt with all data
 * This is a clean orchestrator that composes the specialized modules
 */
export async function renderUserPrompt(sessionState?: SessionState): Promise<string> {
  // Fetch all data in parallel
  const [marketData, accountData] = await Promise.all([
    fetchAllMarketData(),
    fetchAccountData(),
  ]);
  
  // Extract and calculate metrics
  const accountMetrics = extractAccountMetrics(accountData);
  const performanceMetrics = calculatePerformanceMetrics(
    accountMetrics,
    accountData,
    sessionState?.initialBalance
  );
  
  // Generate coin data sections
  const coinDataSections = renderAllCoinDataSections(marketData);
  
  // Prepare session info
  const currentTime = formatTimestampToIST(Date.now());
  const minutesTrading = calculateSessionDuration(sessionState);
  const invocationCount = sessionState?.invocationCount || 0;
  
  // Create placeholder replacements
  const replacements = createAccountReplacements({
    minutesTrading,
    currentTime,
    invocationCount,
    coinDataSections,
    totalReturnPercent: performanceMetrics.totalReturnPercent,
    availableCash: accountMetrics.availableCash,
    accountValue: accountMetrics.accountValue,
    sharpeRatio: performanceMetrics.sharpeRatio,
  });
  
  // Apply all replacements to the prompt template
  return applyReplacements(PROMPT.USER, replacements);
}

/**
 * Get both SYSTEM and USER prompts ready for AI
 */
export async function getFullPrompt(sessionState?: SessionState) {
  const userPrompt = await renderUserPrompt(sessionState);
  
  return {
    system: PROMPT.SYSTEM,
    user: userPrompt,
    assistant: PROMPT.ASSISTANT,
  };
}


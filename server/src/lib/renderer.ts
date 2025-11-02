
import { PROMPT, formatCoinData } from './prompt';
import { getComprehensiveMarketData, getAccountSummary } from './services';
import { getClosedOrders } from './api';
import { TRADING_SYMBOLS, FUTURES_EXCHANGE_ID } from '../config/exchange';
import { formatTimestampToIST } from './utils';

/**
 * Interface for session tracking
 */
export interface SessionState {
  startTime: number;
  invocationCount: number;
  initialBalance?: number; // Optional: stored when session starts
}

/**
 * Helper to format array data for display
 */
function formatArray(arr: number[], maxDisplay: number = 10): string {
  const displayArr = arr.length > maxDisplay ? arr.slice(-maxDisplay) : arr;
  return `[${displayArr.join(', ')}]`;
}

/**
 * Helper to format positions data
 */
function formatPositions(positions: any[]): string {
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
 * Render coin data template with actual values
 */
function renderCoinData(symbol: string, data: any): string {
  const coinName = symbol.replace('USDT', '');
  const coinUpper = coinName.toUpperCase();
  let template = formatCoinData(coinName, {});
  
  // Replace all placeholders for this coin (use replaceAll for each to handle multiple occurrences)
  const replacements: [string, string][] = [
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
  ];
  
  // Apply all replacements
  replacements.forEach(([placeholder, value]) => {
    template = template.replaceAll(placeholder, value);
  });
  
  return template;
}

/**
 * Calculate total return percent
 */
function calculateTotalReturnPercent(accountValue: number, initialBalance: number): number {
  if (!initialBalance || initialBalance === 0) return 0;
  return ((accountValue - initialBalance) / initialBalance) * 100;
}

/**
 * Calculate initial balance from closed orders and current balance
 */
function calculateInitialBalance(currentBalance: number, closedOrders: any[]): number {
  // Ensure closedOrders is an array
  const ordersArray = Array.isArray(closedOrders) ? closedOrders : [];
  
  if (!ordersArray || ordersArray.length === 0) {
    // No historical data, use current balance as initial
    return currentBalance;
  }
  
  // Sum up all realized PnL from closed orders
  const totalPnL = ordersArray.reduce((sum, order) => {
    const pnl = parseFloat(order.realized_pnl || order.pnl || 0);
    return sum + pnl;
  }, 0);
  
  // Initial balance = current balance - total PnL
  const calculatedInitialBalance = currentBalance - totalPnL;
  
  // Return calculated balance or fallback to current balance if calculation is invalid
  return calculatedInitialBalance > 0 ? calculatedInitialBalance : currentBalance;
}

/**
 * Calculate Sharpe Ratio from historical trades
 * Sharpe Ratio = (Average Return - Risk Free Rate) / Standard Deviation of Returns
 * For simplicity, assuming risk-free rate is 0
 */
async function calculateSharpeRatio(closedOrders: any[], initialBalance: number): Promise<number> {
  if (!closedOrders || closedOrders.length === 0) return 0;
  
  try {
    // Calculate returns from closed orders
    const returns: number[] = [];
    let cumulativePnL = 0;
    
    for (const order of closedOrders) {
      const pnL = order.realized_pnl || order.pnl || 0;
      cumulativePnL += pnL;
      
      // Calculate return percentage
      const orderReturn = cumulativePnL / initialBalance;
      returns.push(orderReturn);
    }
    
    if (returns.length === 0) return 0;
    
    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Avoid division by zero
    if (stdDev === 0) return 0;
    
    // Sharpe Ratio = Average Return / Standard Deviation
    return avgReturn / stdDev;
    
  } catch (error) {
    console.error('Error calculating Sharpe Ratio:', error);
    return 0;
  }
}

/**
 * Render full user prompt with all data
 */
export async function renderUserPrompt(sessionState?: SessionState) {
  // Fetch all market data for all symbols
  const allMarketData = await Promise.all(
    TRADING_SYMBOLS.map(symbol => getComprehensiveMarketData(symbol, 5))
  );
  
  // Fetch account summary and closed orders in parallel
  const [accountSummary, closedOrdersData] = await Promise.all([
    getAccountSummary(),
    getClosedOrders({ exchange: FUTURES_EXCHANGE_ID, count: 500 }).catch(() => ({ data: [] }))
  ]);
  
  // Generate coin data sections
  const coinDataSections = TRADING_SYMBOLS.map((symbol, index) => 
    renderCoinData(symbol, allMarketData[index])
  ).join('\n\n');
  
  // Calculate account metrics based on actual response structure
v  const availableCash = parseFloat(accountSummary.portfolio?.data
    ?.find((item: any) => item.currency === 'INR')?.main_balance) || 0;
  
  // Portfolio total value: sum of current_value from crypto holdings only (exclude fiat currencies)
  const cryptoValue = accountSummary.portfolio?.data
    ?.filter((item: any) => item.currency && !['INR', 'USD', 'USDT'].includes(item.currency))
    .reduce((sum: number, item: any) => sum + (parseFloat(item.current_value) || 0), 0) || 0;
  
  // Total account value includes both crypto holdings and available cash
  const accountValue = cryptoValue + availableCash;
  
  const positions = accountSummary.positions?.data || accountSummary.positions || [];
  const closedOrders = closedOrdersData?.data || [];
  
  // Calculate initial balance: use stored value or calculate from closed orders
  const initialBalance = sessionState?.initialBalance || calculateInitialBalance(accountValue, closedOrders);
  const totalReturnPercent = calculateTotalReturnPercent(accountValue, initialBalance);
  
  // const sharpeRatio = await calculateSharpeRatio(closedOrders, initialBalance);
  
  // Get session info
  const currentTime = formatTimestampToIST(Date.now());
  const minutesTrading = sessionState 
    ? Math.floor((Date.now() - sessionState.startTime) / (1000 * 60))
    : 0;
  const invocationCount = sessionState?.invocationCount || 0;
  
  // Replace all placeholders in USER prompt
  return PROMPT.USER
    .replaceAll('{{MINUTES_TRADING}}', String(minutesTrading))
    .replaceAll('{{CURRENT_TIME}}', currentTime)
    .replaceAll('{{INVOCATION_COUNT}}', String(invocationCount))
    .replaceAll('{{COIN_DATA}}', coinDataSections)
    .replaceAll('{{TOTAL_RETURN_PERCENT}}', totalReturnPercent.toFixed(2))
    .replaceAll('{{AVAILABLE_CASH}}', availableCash.toFixed(2))
    .replaceAll('{{ACCOUNT_VALUE}}', accountValue.toFixed(2))
    // .replaceAll('{{POSITIONS}}', formatPositions(positions))
    // .replaceAll('{{SHARPE_RATIO}}', sharpeRatio.toFixed(3));
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


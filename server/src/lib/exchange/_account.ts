import { getFuturesPositions, getUserPortfolio, getWalletBalance, getClosedOrders } from './api';
import { FUTURES_EXCHANGE, BaseApiParams } from '../../types';
import { FUTURES_EXCHANGE_ID } from '../../config/exchange';

/**
 * Get account summary (balance, portfolio, positions)
 */
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
 * Raw account data from API
 */
export interface AccountData {
  accountSummary: Awaited<ReturnType<typeof getAccountSummary>>;
  closedOrders: any[];
}

/**
 * Fetch all account-related data in parallel
 */
export async function fetchAccountData(): Promise<AccountData> {
  const [accountSummary, closedOrdersData] = await Promise.all([
    getAccountSummary(),
    getClosedOrders({ exchange: FUTURES_EXCHANGE_ID, count: 500 }).catch(() => ({ data: [] })),
  ]);

  return {
    accountSummary,
    closedOrders: closedOrdersData?.data || [],
  };
}

/**
 * Extracted account metrics from account summary
 */
export interface AccountMetrics {
  availableCash: number;
  cryptoValue: number;
  accountValue: number;
  positions: any[];
}

/**
 * Extract account metrics from account summary response
 */
export function extractAccountMetrics(accountData: AccountData): AccountMetrics {
  const accountSummary = accountData.accountSummary;
  
  // Available cash in INR
  const availableCash = parseFloat(
    accountSummary.portfolio?.data?.find((item: any) => item.currency === 'INR')?.main_balance
  ) || 0;

  // Portfolio total value: sum of current_value from crypto holdings only (exclude fiat currencies)
  const cryptoValue = accountSummary.portfolio?.data
    ?.filter((item: any) => item.currency && !['INR', 'USD', 'USDT'].includes(item.currency))
    .reduce((sum: number, item: any) => sum + (parseFloat(item.current_value) || 0), 0) || 0;

  // Total account value includes both crypto holdings and available cash
  const accountValue = cryptoValue + availableCash;

  // Extract positions
  const positions = accountSummary.positions?.data || accountSummary.positions || [];

  return {
    availableCash,
    cryptoValue,
    accountValue,
    positions,
  };
}

/**
 * Calculated performance metrics
 */
export interface PerformanceMetrics {
  initialBalance: number;
  totalReturnPercent: number;
  sharpeRatio: number;
}

/**
 * Calculate initial balance from closed orders and current balance
 */
export function calculateInitialBalance(
  accountValue: number,
  closedOrders: any[],
  storedInitialBalance?: number
): number {
  // Use stored value if available
  if (storedInitialBalance && storedInitialBalance > 0) {
    return storedInitialBalance;
  }

  const ordersArray = Array.isArray(closedOrders) ? closedOrders : [];
  
  if (!ordersArray || ordersArray.length === 0) {
    // No historical data, use current balance as initial
    return accountValue;
  }
  
  // Sum up all realized PnL from closed orders
  const totalPnL = ordersArray.reduce((sum, order) => {
    const pnl = parseFloat(order.realized_pnl || order.pnl || 0);
    return sum + pnl;
  }, 0);
  
  // Initial balance = current balance - total PnL
  const calculatedInitialBalance = accountValue - totalPnL;
  
  // Return calculated balance or fallback to current balance if calculation is invalid
  return calculatedInitialBalance > 0 ? calculatedInitialBalance : accountValue;
}

/**
 * Calculate total return percentage
 */
export function calculateTotalReturnPercent(accountValue: number, initialBalance: number): number {
  if (!initialBalance || initialBalance === 0) return 0;
  return ((accountValue - initialBalance) / initialBalance) * 100;
}

/**
 * Calculate Sharpe Ratio from historical trades
 * Sharpe Ratio = (Average Return - Risk Free Rate) / Standard Deviation of Returns
 * For simplicity, assuming risk-free rate is 0
 */
export function calculateSharpeRatio(closedOrders: any[], initialBalance: number): number {
  if (!closedOrders || closedOrders.length === 0 || !initialBalance || initialBalance === 0) {
    return 0;
  }
  
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
 * Calculate all performance metrics
 */
export function calculatePerformanceMetrics(
  accountMetrics: AccountMetrics,
  accountData: AccountData,
  storedInitialBalance?: number
): PerformanceMetrics {
  const initialBalance = calculateInitialBalance(
    accountMetrics.accountValue,
    accountData.closedOrders,
    storedInitialBalance
  );
  
  const totalReturnPercent = calculateTotalReturnPercent(
    accountMetrics.accountValue,
    initialBalance
  );
  
  const sharpeRatio = calculateSharpeRatio(accountData.closedOrders, initialBalance);
  
  return {
    initialBalance,
    totalReturnPercent,
    sharpeRatio,
  };
}


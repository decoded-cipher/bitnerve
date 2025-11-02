
import { FUTURES_EXCHANGE_ID } from '../../config/exchange';
import { getFuturesPositions, getUserPortfolio, getWalletBalance, getClosedOrders } from './api';
import { FUTURES_EXCHANGE, BaseApiParams, AccountData, AccountMetrics, PerformanceMetrics } from '../../types';



// Fetches account data including balance, portfolio, positions, and closed orders
export async function fetchAccountData(): Promise<AccountData> {
  const params: BaseApiParams = { exchange: FUTURES_EXCHANGE };
  
  const [balance, portfolio, positions, closedOrdersData] = await Promise.all([
    getWalletBalance(),
    getUserPortfolio(),
    getFuturesPositions(params),
    getClosedOrders({ exchange: FUTURES_EXCHANGE_ID, count: 500 }).catch(() => ({ data: [] })),
  ]);

  const accountSummary = { balance, portfolio, positions };

  return {
    accountSummary,
    closedOrders: closedOrdersData?.data || [],
  };
}



// Computes key account metrics from the fetched account data
export function getAccountMetrics(accountData: AccountData): AccountMetrics {
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



// Calculates performance metrics such as initial balance, total return percentage, and Sharpe Ratio
export function calcPerformanceMetrics(
  accountMetrics: AccountMetrics,
  accountData: AccountData,
  storedInitialBalance?: number
): PerformanceMetrics {
  
  // Calculate initial balance from closed orders and current balance
  let initialBalance: number;
  if (storedInitialBalance && storedInitialBalance > 0) {
    initialBalance = storedInitialBalance;
  } else {
    const ordersArray = Array.isArray(accountData.closedOrders) ? accountData.closedOrders : [];
    if (!ordersArray || ordersArray.length === 0) {
      initialBalance = accountMetrics.accountValue;
    } else {
      const totalPnL = ordersArray.reduce((sum, order) => {
        const pnl = parseFloat(order.realized_pnl || order.pnl || 0);
        return sum + pnl;
      }, 0);
      const calculatedInitialBalance = accountMetrics.accountValue - totalPnL;
      initialBalance = calculatedInitialBalance > 0 ? calculatedInitialBalance : accountMetrics.accountValue;
    }
  }
  
  // Calculate total return percentage
  const totalReturnPercent = initialBalance && initialBalance !== 0
    ? ((accountMetrics.accountValue - initialBalance) / initialBalance) * 100
    : 0;
  
  // Calculate Sharpe Ratio
  let sharpeRatio = 0;
  if (accountData.closedOrders && accountData.closedOrders.length > 0 && initialBalance && initialBalance !== 0) {
    try {
      const returns: number[] = [];
      let cumulativePnL = 0;
      
      for (const order of accountData.closedOrders) {
        const pnL = order.realized_pnl || order.pnl || 0;
        cumulativePnL += pnL;
        const orderReturn = cumulativePnL / initialBalance;
        returns.push(orderReturn);
      }
      
      if (returns.length > 0) {
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev !== 0) {
          sharpeRatio = avgReturn / stdDev;
        }
      }
    } catch (error) {
      console.error('Error calculating Sharpe Ratio:', error);
    }
  }
  
  return {
    initialBalance,
    totalReturnPercent,
    sharpeRatio,
  };
}

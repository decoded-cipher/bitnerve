import { db, accounts, positions, orders, accountSnapshots } from '../../config/database';
import { eq, and, desc } from 'drizzle-orm';
import { isSupportedSymbol } from '../../config/exchange';

/**
 * Simulation service for paper trading
 * Simulates trading operations without real money
 */

// Get or create a default trading account
export async function getOrCreateAccount(initialBalance: number = 10000) {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .limit(1);

  if (existingAccount) {
    return existingAccount;
  }

  const [newAccount] = await db
    .insert(accounts)
    .values({
      initial_balance: initialBalance.toString(),
      current_balance: initialBalance.toString(),
      total_pnl: '0',
      account_value: initialBalance.toString(),
      crypto_value: '0',
      total_return_percent: '0',
      sharpe_ratio: null,
    })
    .returning();

  return newAccount;
}

// Get account details
export async function getAccountBalance(accountId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  return account;
}

// Get open positions for an account
export async function getOpenPositions(accountId: string) {
  return await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.account_id, accountId),
        eq(positions.is_open, true)
      )
    )
    .orderBy(desc(positions.created_at));
}

// Get closed orders for an account
export async function getClosedOrders(accountId: string) {
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.account_id, accountId),
        eq(orders.status, 'FILLED')
      )
    )
    .orderBy(desc(orders.created_at));
}

// Update position's unrealized PnL based on current price
export async function updatePositionPnL(positionId: string, currentPrice: number) {
  const [position] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position) {
    throw new Error('Position not found');
  }

  const entryPrice = parseFloat(position.entry_price);
  const quantity = parseFloat(position.quantity);
  const side = position.side;
  
  // Calculate unrealized PnL
  let unrealizedPnL = 0;
  if (side === 'BUY') {
    unrealizedPnL = (currentPrice - entryPrice) * quantity;
  } else if (side === 'SELL') {
    unrealizedPnL = (entryPrice - currentPrice) * quantity;
  }

  const [updated] = await db
    .update(positions)
    .set({
      current_price: currentPrice.toString(),
      unrealized_pnl: unrealizedPnL.toString(),
      updated_at: new Date(),
    })
    .where(eq(positions.id, positionId))
    .returning();

  // Update account metrics after position PnL update
  await getAccountMetrics(updated.account_id);

  return updated;
}

// Create a new position (opening)
export async function createPosition(
  accountId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  agentInvocationId?: string
) {
  // Validate symbol is supported
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT`);
  }

  const account = await getAccountBalance(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  // Check if position already exists for this symbol
  const openPositions = await getOpenPositions(accountId);
  const existingPosition = openPositions.find(p => p.symbol === symbol);
  
  if (existingPosition) {
    throw new Error(`Position already exists for ${symbol}. Use updatePosition instead.`);
  }

  // Create new position
  const [newPosition] = await db
    .insert(positions)
    .values({
      account_id: accountId,
      symbol,
      side,
      quantity: quantity.toString(),
      entry_price: price.toString(),
      current_price: price.toString(),
      unrealized_pnl: '0',
      leverage: 1,
      is_open: true,
    })
    .returning();

  // Calculate trade value
  const tradeValue = side === 'BUY' ? price * quantity : -price * quantity;
  
  // Update account balance
  const currentBalance = parseFloat(account.current_balance);
  const newBalance = currentBalance + tradeValue;

  await db
    .update(accounts)
    .set({
      current_balance: newBalance.toString(),
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  // Create order record
  const [order] = await db
    .insert(orders)
    .values({
      account_id: accountId,
      agent_invocation_id: agentInvocationId,
      symbol,
      side,
      order_type: 'MARKET',
      quantity: quantity.toString(),
      price: price.toString(),
      status: 'FILLED',
      filled_price: price.toString(),
      trade_value: tradeValue.toString(),
      position_id: newPosition.id,
    })
    .returning();

  // Update account metrics after position creation
  await getAccountMetrics(accountId);

  return {
    position: newPosition,
    order,
  };
}

// Close an existing position
export async function closePosition(
  accountId: string,
  symbol: string,
  quantity?: number, // If not provided, close entire position
  agentInvocationId?: string
) {
  // Validate symbol is supported
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT`);
  }

  const account = await getAccountBalance(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  // Find existing position
  const openPositions = await getOpenPositions(accountId);
  const existingPosition = openPositions.find(p => p.symbol === symbol);
  
  if (!existingPosition) {
    throw new Error(`No open position found for ${symbol}`);
  }

  const existingQuantity = parseFloat(existingPosition.quantity);
  const closingQuantity = quantity ? Math.min(quantity, existingQuantity) : existingQuantity;
  const remainingQuantity = existingQuantity - closingQuantity;

  // Calculate realized PnL
  const entryPrice = parseFloat(existingPosition.entry_price);
  const currentPrice = parseFloat(existingPosition.current_price);
  
  let realizedPnL = 0;
  if (existingPosition.side === 'BUY') {
    realizedPnL = (currentPrice - entryPrice) * closingQuantity;
  } else if (existingPosition.side === 'SELL') {
    realizedPnL = (entryPrice - currentPrice) * closingQuantity;
  }

  // Update or close position
  if (remainingQuantity > 0) {
    // Partially close position
    await db
      .update(positions)
      .set({
        quantity: remainingQuantity.toString(),
        updated_at: new Date(),
      })
      .where(eq(positions.id, existingPosition.id));
  } else {
    // Fully close position
    await db
      .update(positions)
      .set({
        is_open: false,
        updated_at: new Date(),
      })
      .where(eq(positions.id, existingPosition.id));
  }

  // Calculate trade value for closing
  const oppositeSide = existingPosition.side === 'BUY' ? 'SELL' : 'BUY';
  const tradeValue = oppositeSide === 'BUY' ? currentPrice * closingQuantity : -currentPrice * closingQuantity;

  // Update account balance
  const currentBalance = parseFloat(account.current_balance);
  const totalPnL = parseFloat(account.total_pnl);
  
  const newBalance = currentBalance + tradeValue + realizedPnL;
  const newTotalPnL = totalPnL + realizedPnL;

  await db
    .update(accounts)
    .set({
      current_balance: newBalance.toString(),
      total_pnl: newTotalPnL.toString(),
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  // Create order record
  const [order] = await db
    .insert(orders)
    .values({
      account_id: accountId,
      agent_invocation_id: agentInvocationId,
      symbol,
      side: oppositeSide,
      order_type: 'MARKET',
      quantity: closingQuantity.toString(),
      price: currentPrice.toString(),
      status: 'FILLED',
      filled_price: currentPrice.toString(),
      realized_pnl: realizedPnL.toString(),
      trade_value: tradeValue.toString(),
      position_id: existingPosition.id,
    })
    .returning();

  // Update account metrics after position closure
  await getAccountMetrics(accountId);

  return {
    realizedPnL,
    closedQuantity: closingQuantity,
    order,
  };
}

// Get account metrics for agent and update database
export async function getAccountMetrics(accountId: string) {
  const account = await getAccountBalance(accountId);
  const openPositions = await getOpenPositions(accountId);
  const closedOrders = await getClosedOrders(accountId);

  const initialBalance = parseFloat(account.initial_balance);
  const currentBalance = parseFloat(account.current_balance);
  const totalPnL = parseFloat(account.total_pnl);

  // Calculate unrealized PnL from open positions
  const unrealizedPnL = openPositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.unrealized_pnl);
  }, 0);

  const accountValue = currentBalance + unrealizedPnL;
  const totalReturnPercent = initialBalance > 0 
    ? ((accountValue - initialBalance) / initialBalance) * 100 
    : 0;

  // Calculate Sharpe Ratio
  let sharpeRatio: number | null = null;
  if (closedOrders.length > 0 && initialBalance > 0) {
    try {
      const returns: number[] = [];
      let cumulativePnL = 0;

      for (const order of closedOrders) {
        const pnl = parseFloat(order.realized_pnl || '0');
        cumulativePnL += pnl;
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

  // Update account with calculated metrics
  await db
    .update(accounts)
    .set({
      account_value: accountValue.toString(),
      crypto_value: unrealizedPnL.toString(),
      total_return_percent: totalReturnPercent.toString(),
      sharpe_ratio: sharpeRatio !== null ? sharpeRatio.toString() : null,
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  return {
    availableCash: currentBalance,
    cryptoValue: unrealizedPnL,
    accountValue,
    positions: openPositions,
    totalReturnPercent,
    sharpeRatio: sharpeRatio || 0,
    initialBalance,
  };
}

// Create an account snapshot for historical tracking
export async function createAccountSnapshot(accountId: string): Promise<void> {
  const account = await getAccountBalance(accountId);
  if (!account) {
    throw new Error('Account not found');
  }

  // Get updated account metrics (this also updates the database)
  await getAccountMetrics(accountId);
  
  // Get updated account with metrics
  const updatedAccount = await getAccountBalance(accountId);

  await db
    .insert(accountSnapshots)
    .values({
      account_id: accountId,
      account_value: updatedAccount.account_value || updatedAccount.current_balance,
      current_balance: updatedAccount.current_balance,
      crypto_value: updatedAccount.crypto_value || '0',
      total_pnl: updatedAccount.total_pnl,
      total_return_percent: updatedAccount.total_return_percent,
      sharpe_ratio: updatedAccount.sharpe_ratio,
      snapshot_at: new Date(),
    });
}

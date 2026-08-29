import { db, accounts, positions, orders, accountSnapshots, marketPrices } from '../../config/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isSupportedSymbol, TRADING_SYMBOLS } from '../../config/exchange';
import { TRADING_PROVIDER, TRADING_MODEL } from '../../config/model';

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const MIN_SHARPE_TRADES = 2;

function fitNumeric(value: number, precision: number, scale: number): string | null {
  if (!Number.isFinite(value)) return null;
  const max = 10 ** (precision - scale) - 10 ** -scale;
  const clamped = Math.min(Math.max(value, -max), max);
  return clamped.toFixed(scale);
}

/**
 * Simulation service for paper trading
 * Simulates trading operations without real money
 */

// Get or create the trading account for a given model
export async function getOrCreateAccount(
  initialBalance: number = 10000,
  provider: string = TRADING_PROVIDER,
  modelName: string = TRADING_MODEL
) {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.provider, provider), eq(accounts.model_name, modelName)))
    .limit(1);

  if (existingAccount) {
    return existingAccount;
  }

  const [newAccount] = await db
    .insert(accounts)
    .values({
      provider,
      model_name: modelName,
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
export async function getAccountBalance(accountId: string, tx: Executor = db) {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  return account;
}

// Get open positions for an account
export async function getOpenPositions(accountId: string, tx: Executor = db) {
  return await tx
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
export async function getClosedOrders(accountId: string, tx: Executor = db) {
  return await tx
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

// Refresh open positions against live prices
export async function markPositionsToMarket(
  accountId: string,
  prices: Map<string, number>
): Promise<number> {
  const openPositions = await getOpenPositions(accountId);
  let updated = 0;

  for (const position of openPositions) {
    const price = prices.get(position.symbol);
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    const entryPrice = parseFloat(position.entry_price);
    const quantity = parseFloat(position.quantity);
    const direction = position.side === 'SELL' ? -1 : 1;
    const unrealizedPnL = (price - entryPrice) * quantity * direction;

    await db
      .update(positions)
      .set({
        current_price: price.toString(),
        unrealized_pnl: unrealizedPnL.toString(),
        updated_at: new Date(),
      })
      .where(eq(positions.id, position.id));

    updated++;
  }

  if (updated > 0) {
    await getAccountMetrics(accountId);
  }

  return updated;
}

// Create a new position (opening)
export async function createPosition(
  accountId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  agentInvocationId?: string,
  leverage: number = 1
) {
  // Validate symbol is supported
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: ${TRADING_SYMBOLS.join(', ')}`);
  }

  return db.transaction(async (tx) => {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1)
    .for('update');
  if (!account) {
    throw new Error('Account not found');
  }

  // Check if position already exists for this symbol
  const openPositions = await getOpenPositions(accountId, tx);
  const existingPosition = openPositions.find(p => p.symbol === symbol);
  
  if (existingPosition) {
    throw new Error(`Position already exists for ${symbol}. Use updatePosition instead.`);
  }

  const normalizedLeverage = Number.isFinite(leverage) && leverage > 0 ? Math.max(1, Math.floor(leverage)) : 1;

  const [newPosition] = await tx
    .insert(positions)
    .values({
      account_id: accountId,
      symbol,
      side,
      quantity: quantity.toString(),
      entry_price: price.toString(),
      current_price: price.toString(),
      unrealized_pnl: '0',
      leverage: normalizedLeverage,
      is_open: true,
    })
    .returning();

  // Calculate trade value (signed notional) and margin requirement
  const notional = price * quantity;
  const tradeValue = side === 'BUY' ? notional : -notional;
  const marginUsed = Math.abs(notional) / normalizedLeverage;
  
  // Update account balance
  const currentBalance = parseFloat(account.current_balance);
  const newBalance = currentBalance - marginUsed;

  if (!Number.isFinite(newBalance)) {
    throw new Error('Invalid balance calculation when creating position');
  }
  if (newBalance < 0) {
    throw new Error('Insufficient balance to satisfy margin requirement for this position');
  }

  await tx
    .update(accounts)
    .set({
      current_balance: newBalance.toString(),
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  // Create order record
  const [order] = await tx
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
      metadata: {
        leverage: normalizedLeverage,
        margin_used: marginUsed,
      } as any,
    })
    .returning();

  // Update account metrics after position creation
  await getAccountMetrics(accountId, tx);

  return {
    position: newPosition,
    order,
  };
  });
}

// Close an existing position
export async function closePosition(
  accountId: string,
  symbol: string,
  exitPrice: number,
  quantity?: number, // If not provided, close entire position
  agentInvocationId?: string
) {
  // Validate symbol is supported
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: ${TRADING_SYMBOLS.join(', ')}`);
  }

  return db.transaction(async (tx) => {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1)
    .for('update');
  if (!account) {
    throw new Error('Account not found');
  }

  // Find existing position
  const openPositions = await getOpenPositions(accountId, tx);
  const existingPosition = openPositions.find(p => p.symbol === symbol);
  
  if (!existingPosition) {
    throw new Error(`No open position found for ${symbol}`);
  }

  const existingQuantity = parseFloat(existingPosition.quantity);
  const closingQuantity = quantity ? Math.min(quantity, existingQuantity) : existingQuantity;
  const remainingQuantity = existingQuantity - closingQuantity;

  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    throw new Error('A positive exit price is required to close a position');
  }

  // Calculate realized PnL
  const entryPrice = parseFloat(existingPosition.entry_price);
  const currentPrice = exitPrice;
  const positionLeverage = existingPosition.leverage || 1;
  
  let realizedPnL = 0;
  if (existingPosition.side === 'BUY') {
    realizedPnL = (currentPrice - entryPrice) * closingQuantity;
  } else if (existingPosition.side === 'SELL') {
    realizedPnL = (entryPrice - currentPrice) * closingQuantity;
  }

  // Update or close position
  if (remainingQuantity > 0) {
    // Partially close position
    const remainingUnrealizedPnL =
      existingPosition.side === 'BUY'
        ? (currentPrice - entryPrice) * remainingQuantity
        : (entryPrice - currentPrice) * remainingQuantity;

    await tx
      .update(positions)
      .set({
        quantity: remainingQuantity.toString(),
        current_price: currentPrice.toString(),
        unrealized_pnl: remainingUnrealizedPnL.toString(),
        updated_at: new Date(),
      })
      .where(eq(positions.id, existingPosition.id));
  } else {
    // Fully close position
    await tx
      .update(positions)
      .set({
        quantity: '0',
        is_open: false,
        current_price: currentPrice.toString(),
        unrealized_pnl: '0',
        updated_at: new Date(),
      })
      .where(eq(positions.id, existingPosition.id));
  }

  // Calculate trade value for closing
  const oppositeSide = existingPosition.side === 'BUY' ? 'SELL' : 'BUY';
  const tradeValue = oppositeSide === 'BUY' ? currentPrice * closingQuantity : -currentPrice * closingQuantity;
  const marginRelease = (entryPrice * closingQuantity) / positionLeverage;

  // Update account balance
  const currentBalance = parseFloat(account.current_balance);
  const totalPnL = parseFloat(account.total_pnl);
  
  const newBalance = currentBalance + marginRelease + realizedPnL;
  const newTotalPnL = totalPnL + realizedPnL;

  await tx
    .update(accounts)
    .set({
      current_balance: newBalance.toString(),
      total_pnl: newTotalPnL.toString(),
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  // Create order record
  const [order] = await tx
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
      metadata: {
        leverage: positionLeverage,
        margin_released: marginRelease,
        closed_quantity: closingQuantity,
      } as any,
    })
    .returning();

  // Update account metrics after position closure
  await getAccountMetrics(accountId, tx);

  return {
    realizedPnL,
    closedQuantity: closingQuantity,
    order,
  };
  });
}

// Get account metrics for agent and update database
export async function getAccountMetrics(accountId: string, tx: Executor = db) {
  const account = await getAccountBalance(accountId, tx);
  const openPositions = await getOpenPositions(accountId, tx);
  const closedOrders = await getClosedOrders(accountId, tx);

  const initialBalance = parseFloat(account.initial_balance);
  const currentBalance = parseFloat(account.current_balance);
  // Aggregate position exposure, unrealized PnL, and reserved margin
  const { notional: cryptoValue, unrealized: unrealizedPnL, margin: reservedMargin } = openPositions.reduce(
    (totals, pos) => {
      const quantity = parseFloat(pos.quantity);
      const currentPrice = parseFloat(pos.current_price);
      const entryPrice = parseFloat(pos.entry_price);
      const direction = pos.side === 'SELL' ? -1 : 1;
      const leverage = pos.leverage || 1;

      const positionNotional = currentPrice * quantity * direction;
      const positionUnrealized = (currentPrice - entryPrice) * quantity * direction;
      const positionMargin = (entryPrice * quantity) / leverage;

      return {
        notional: totals.notional + positionNotional,
        unrealized: totals.unrealized + positionUnrealized,
        margin: totals.margin + positionMargin,
      };
    },
    { notional: 0, unrealized: 0, margin: 0 }
  );

  const accountValue = currentBalance + reservedMargin + unrealizedPnL;
  const totalReturnPercent = initialBalance > 0 
    ? ((accountValue - initialBalance) / initialBalance) * 100 
    : 0;

  // Sharpe ratio over per-trade returns, each measured against the starting balance
  let sharpeRatio: number | null = null;
  if (closedOrders.length >= MIN_SHARPE_TRADES && initialBalance > 0) {
    const returns = closedOrders.map(order => parseFloat(order.realized_pnl || '0') / initialBalance);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev > 1e-9) {
      sharpeRatio = avgReturn / stdDev;
    }
  }

  // Update account with calculated metrics
  await tx
    .update(accounts)
    .set({
      account_value: fitNumeric(accountValue, 20, 8),
      crypto_value: fitNumeric(cryptoValue, 20, 8),
      total_return_percent: fitNumeric(totalReturnPercent, 10, 4),
      sharpe_ratio: sharpeRatio !== null ? fitNumeric(sharpeRatio, 10, 6) : null,
      updated_at: new Date(),
    })
    .where(eq(accounts.id, accountId));

  return {
    availableCash: currentBalance,
    cryptoValue,
    accountValue,
    positions: openPositions,
    totalReturnPercent,
    sharpeRatio,
    unrealizedPnL,
    reservedMargin,
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

// Upsert the latest mark price per symbol
export async function upsertMarketPrices(
  prices: Array<{ symbol: string; price: number }>
): Promise<number> {
  const rows = prices.filter(p => Number.isFinite(p.price) && p.price > 0);
  if (rows.length === 0) {
    return 0;
  }

  await db
    .insert(marketPrices)
    .values(
      rows.map(p => ({
        symbol: p.symbol,
        price: p.price.toString(),
        sort_order: TRADING_SYMBOLS.indexOf(p.symbol),
        updated_at: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: marketPrices.symbol,
      set: {
        price: sql`excluded.price`,
        sort_order: sql`excluded.sort_order`,
        updated_at: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

import { db, accounts, positions, orders, accountSnapshots, marketPrices, positionOrders } from '../../config/database';
import { eq, and, gte, desc, sql, isNotNull } from 'drizzle-orm';
import { isSupportedSymbol, TRADING_SYMBOLS } from '../../config/exchange';
import { TRADING_PROVIDER, TRADING_MODEL } from '../../config/model';
import { getInstrument } from './instruments';

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const MIN_SHARPE_TRADES = 2;

const MAX_DRAWDOWN_FROM_PEAK = Number.parseFloat(process.env.MAX_DRAWDOWN_FROM_PEAK ?? '') || 0.08;
const DRAWDOWN_PEAK_WINDOW_HOURS = Number.parseFloat(process.env.DRAWDOWN_PEAK_WINDOW_HOURS ?? '') || 12;

async function assertDrawdownAllowsEntry(tx: Executor, account: typeof accounts.$inferSelect): Promise<void> {
  const equity = parseFloat(account.account_value ?? account.current_balance);
  if (!Number.isFinite(equity) || equity <= 0) return;

  const since = new Date(Date.now() - DRAWDOWN_PEAK_WINDOW_HOURS * 3_600_000);
  const [row] = await tx
    .select({ peak: sql<string | null>`max(${accountSnapshots.account_value})` })
    .from(accountSnapshots)
    .where(and(eq(accountSnapshots.account_id, account.id), gte(accountSnapshots.created_at, since)));

  const peak = Math.max(parseFloat(row?.peak ?? '0') || 0, equity);
  const drawdown = (peak - equity) / peak;
  if (drawdown > MAX_DRAWDOWN_FROM_PEAK) {
    throw new Error(
      `Drawdown guard: equity ${equity.toFixed(2)} is ${(drawdown * 100).toFixed(2)}% below the ${DRAWDOWN_PEAK_WINDOW_HOURS}h peak of ${peak.toFixed(2)}, over the ${(MAX_DRAWDOWN_FROM_PEAK * 100).toFixed(0)}% limit. No new positions until equity recovers or that peak ages out of the window. Managing and closing what you hold is still allowed.`
    );
  }
}


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
async function getAccountBalance(accountId: string, tx: Executor = db) {
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

// Closed round trips, newest first, joined to the position they closed
export async function getRecentTrades(accountId: string, limit = 10) {
  return await db
    .select({
      symbol: orders.symbol,
      side: positions.side,
      leverage: positions.leverage,
      entryPrice: positions.entry_price,
      exitPrice: orders.filled_price,
      quantity: orders.quantity,
      realized: orders.realized_pnl,
      metadata: orders.metadata,
      openedAt: positions.created_at,
      closedAt: orders.created_at,
    })
    .from(orders)
    .innerJoin(positions, eq(positions.id, orders.position_id))
    .where(and(eq(orders.account_id, accountId), isNotNull(orders.realized_pnl)))
    .orderBy(desc(orders.created_at))
    .limit(limit);
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
export function assertStopSide(side: 'BUY' | 'SELL', stopPrice: number, mark: number): void {
  if (!Number.isFinite(stopPrice) || stopPrice <= 0) {
    throw new Error('A positive stop price is required');
  }
  if (side === 'BUY' && stopPrice >= mark) {
    throw new Error(`A long stop must sit below the mark: stop ${stopPrice} is not below ${mark}`);
  }
  if (side === 'SELL' && stopPrice <= mark) {
    throw new Error(`A short stop must sit above the mark: stop ${stopPrice} is not above ${mark}`);
  }
}

export async function createPosition(
  accountId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  agentInvocationId?: string,
  leverage: number = 1,
  stopPrice?: number
) {
  // Validate symbol is supported
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: ${TRADING_SYMBOLS.join(', ')}`);
  }

  const { takerFeeRate } = await getInstrument(symbol);

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
    throw new Error(`Position already exists for ${symbol}. Size cannot be increased; close it fully or partially first.`);
  }

  await assertDrawdownAllowsEntry(tx, account);

  const normalizedLeverage = Number.isFinite(leverage) && leverage > 0 ? Math.max(1, Math.floor(leverage)) : 1;

  if (stopPrice !== undefined) assertStopSide(side, stopPrice, price);

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
      stop_price: stopPrice !== undefined ? stopPrice.toString() : null,
      is_open: true,
    })
    .returning();

  // Calculate trade value (signed notional) and margin requirement
  const notional = price * quantity;
  const tradeValue = side === 'BUY' ? notional : -notional;
  const marginUsed = Math.abs(notional) / normalizedLeverage;
  const entryFee = Math.abs(notional) * takerFeeRate;
  
  // Update account balance
  const currentBalance = parseFloat(account.current_balance);
  const newBalance = currentBalance - marginUsed - entryFee;

  if (!Number.isFinite(newBalance)) {
    throw new Error('Invalid balance calculation when creating position');
  }
  if (newBalance < 0) {
    throw new Error(`Insufficient balance: needs ${(marginUsed + entryFee).toFixed(2)} (margin ${marginUsed.toFixed(2)} + taker fee ${entryFee.toFixed(2)}), free cash ${currentBalance.toFixed(2)}`);
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
        entry_fee: entryFee,
      } as any,
    })
    .returning();

  // Update account metrics after position creation
  await getAccountMetrics(accountId, tx);

  return {
    position: newPosition,
    order,
    entryFee,
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

  const { takerFeeRate } = await getInstrument(symbol);

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
  
  let grossPnL = 0;
  if (existingPosition.side === 'BUY') {
    grossPnL = (currentPrice - entryPrice) * closingQuantity;
  } else if (existingPosition.side === 'SELL') {
    grossPnL = (entryPrice - currentPrice) * closingQuantity;
  }

  const entryFee = entryPrice * closingQuantity * takerFeeRate;
  const exitFee = currentPrice * closingQuantity * takerFeeRate;
  const realizedPnL = grossPnL - entryFee - exitFee;

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
  
  const newBalance = currentBalance + marginRelease + grossPnL - exitFee;
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
        gross_pnl: grossPnL,
        entry_fee: entryFee,
        exit_fee: exitFee,
      } as any,
    })
    .returning();

  // Update account metrics after position closure
  await getAccountMetrics(accountId, tx);

  return {
    realizedPnL,
    grossPnL,
    fees: entryFee + exitFee,
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

  // Sharpe ratio over per-trade returns
  let sharpeRatio: number | null = null;
  const realisedOrders = closedOrders.filter(order => order.realized_pnl !== null);
  if (realisedOrders.length >= MIN_SHARPE_TRADES && initialBalance > 0) {
    const returns = realisedOrders.map(order => parseFloat(order.realized_pnl || '0') / initialBalance);
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

export async function addToPosition(
  accountId: string,
  symbol: string,
  addQuantity: number,
  price: number,
  agentInvocationId?: string
) {
  if (!isSupportedSymbol(symbol)) {
    throw new Error(`Symbol ${symbol} is not supported. Supported symbols are: ${TRADING_SYMBOLS.join(', ')}`);
  }
  if (!Number.isFinite(addQuantity) || addQuantity <= 0) {
    throw new Error('A positive quantity is required to add to a position');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('A positive mark price is required to add to a position');
  }

  const { takerFeeRate } = await getInstrument(symbol);

  return db.transaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)
      .for('update');
    if (!account) throw new Error('Account not found');

    const openPositions = await getOpenPositions(accountId, tx);
    const position = openPositions.find(p => p.symbol === symbol);
    if (!position) throw new Error(`No open position found for ${symbol}`);

    const oldQuantity = parseFloat(position.quantity);
    const oldEntry = parseFloat(position.entry_price);
    const leverage = position.leverage || 1;

    const openDirection = position.side === 'SELL' ? -1 : 1;
    const existingUnrealized = (price - oldEntry) * oldQuantity * openDirection;
    if (existingUnrealized < 0) {
      throw new Error(
        `Cannot add to a losing position: ${symbol} is ${existingUnrealized.toFixed(2)} down at ${price} against an entry of ${oldEntry.toFixed(8).replace(/0+$/, '')}. Adding to a falling position compounds one sized loss into a larger one. Cut it, or hold it at its current size.`
      );
    }

    const newQuantity = oldQuantity + addQuantity;
    const newEntry = (oldQuantity * oldEntry + addQuantity * price) / newQuantity;

    const addedNotional = price * addQuantity;
    const marginUsed = addedNotional / leverage;
    const entryFee = addedNotional * takerFeeRate;

    const currentBalance = parseFloat(account.current_balance);
    const newBalance = currentBalance - marginUsed - entryFee;
    if (!Number.isFinite(newBalance)) {
      throw new Error('Invalid balance calculation when adding to position');
    }
    if (newBalance < 0) {
      throw new Error(`Insufficient balance: needs ${(marginUsed + entryFee).toFixed(2)} (margin ${marginUsed.toFixed(2)} + taker fee ${entryFee.toFixed(2)}), free cash ${currentBalance.toFixed(2)}`);
    }

    const direction = position.side === 'SELL' ? -1 : 1;
    const unrealizedPnL = (price - newEntry) * newQuantity * direction;

    await tx
      .update(positions)
      .set({
        quantity: newQuantity.toString(),
        entry_price: newEntry.toString(),
        current_price: price.toString(),
        unrealized_pnl: unrealizedPnL.toString(),
        updated_at: new Date(),
      })
      .where(eq(positions.id, position.id));

    await tx
      .update(accounts)
      .set({ current_balance: newBalance.toString(), updated_at: new Date() })
      .where(eq(accounts.id, accountId));

    const tradeValue = position.side === 'BUY' ? addedNotional : -addedNotional;

    const [order] = await tx
      .insert(orders)
      .values({
        account_id: accountId,
        agent_invocation_id: agentInvocationId,
        symbol,
        side: position.side,
        order_type: 'MARKET',
        quantity: addQuantity.toString(),
        price: price.toString(),
        status: 'FILLED',
        filled_price: price.toString(),
        trade_value: tradeValue.toString(),
        position_id: position.id,
        metadata: {
          leverage,
          margin_used: marginUsed,
          entry_fee: entryFee,
          added_to_position: true,
          quantity_before: oldQuantity,
          quantity_after: newQuantity,
          entry_before: oldEntry,
          entry_after: newEntry,
        } as any,
      })
      .returning();

    await getAccountMetrics(accountId, tx);

    return { order, entryFee, marginUsed, newQuantity, newEntry, previousEntry: oldEntry, leverage };
  });
}

export async function setStop(accountId: string, symbol: string, stopPrice: number, mark: number) {
  const openPositions = await getOpenPositions(accountId);
  const position = openPositions.find(p => p.symbol === symbol);
  if (!position) throw new Error(`No open position found for ${symbol}`);

  assertStopSide(position.side as 'BUY' | 'SELL', stopPrice, mark);

  const previous = position.stop_price !== null ? parseFloat(position.stop_price) : null;

  await db
    .update(positions)
    .set({ stop_price: stopPrice.toString(), updated_at: new Date() })
    .where(eq(positions.id, position.id));

  return { previous, stopPrice, side: position.side, entryPrice: parseFloat(position.entry_price) };
}

export interface StopCandle {
  start_time: string | number;
  close_time?: string | number;
  o: string | number;
  h: string | number;
  l: string | number;
}

export interface ExitEvent {
  symbol: string;
  side: string;
  kind: 'STOP' | 'TAKE_PROFIT' | 'MOVE_STOP' | 'TRAIL';
  label: string;
  at: number;
  triggerPrice: number;
  fillPrice?: number;
  quantity?: number;
  realizedPnL?: number;
  newStop?: number;
  gapped?: boolean;
}

export async function buildExitLadder(
  accountId: string,
  positionId: string,
  side: 'BUY' | 'SELL',
  entry: number,
  stop: number,
  quantity: number,
  trailDistance: number,
  quantityStep: number
): Promise<void> {
  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return;

  const dir = side === 'BUY' ? 1 : -1;
  const at = (multiple: number) => entry + dir * risk * multiple;

  const snap = (q: number) => (quantityStep > 0 ? Math.floor(q / quantityStep) * quantityStep : q);
  const third = snap(quantity / 3);

  const rows: Array<typeof positionOrders.$inferInsert> = [];

  if (third > 0) {
    rows.push({
      account_id: accountId,
      position_id: positionId,
      kind: 'TAKE_PROFIT',
      label: '+1R',
      trigger_price: at(1).toString(),
      quantity: third.toString(),
    });
  }

  rows.push({
    account_id: accountId,
    position_id: positionId,
    kind: 'MOVE_STOP',
    label: '+1.5R',
    trigger_price: at(1.5).toString(),
    new_stop: entry.toString(),
  });

  if (trailDistance > 0) {
    rows.push({
      account_id: accountId,
      position_id: positionId,
      kind: 'TRAIL',
      label: '+2R',
      trigger_price: at(2).toString(),
      trail_distance: trailDistance.toString(),
    });
  }

  await db.insert(positionOrders).values(rows);
}

export async function getPositionOrders(accountId: string) {
  return await db
    .select()
    .from(positionOrders)
    .where(and(eq(positionOrders.account_id, accountId), eq(positionOrders.status, 'PENDING')));
}

export async function enforceExits(
  accountId: string,
  candlesBySymbol: Map<string, StopCandle[]>
): Promise<ExitEvent[]> {
  const events: ExitEvent[] = [];

  const [lock] = await db.execute(
    sql`select pg_try_advisory_lock(hashtext(${accountId})) as acquired`
  ) as unknown as Array<{ acquired: boolean }>;
  if (!lock?.acquired) return events;

  try {
    const openPositions = await getOpenPositions(accountId);

    for (const position of openPositions) {
      const candles = candlesBySymbol.get(position.symbol);
      if (!candles || candles.length === 0) continue;

      const isLong = position.side === 'BUY';
      const since = new Date(position.updated_at).getTime();
      const bars = candles
        .filter(c => {
          const end = c.close_time !== undefined ? Number(c.close_time) : Number(c.start_time);
          return end > since;
        })
        .sort((a, b) => Number(a.start_time) - Number(b.start_time));
      if (bars.length === 0) continue;

      let stop = position.stop_price !== null ? parseFloat(position.stop_price) : null;
      let stopDirty = false;
      let trailDistance: number | null = null;
      let closed = false;

      const pending = await db
        .select()
        .from(positionOrders)
        .where(and(eq(positionOrders.position_id, position.id), eq(positionOrders.status, 'PENDING')));
      const live = new Map(pending.map(o => [o.id, o]));

      const fire = async (id: string) => {
        await db
          .update(positionOrders)
          .set({ status: 'TRIGGERED', triggered_at: new Date(), updated_at: new Date() })
          .where(eq(positionOrders.id, id));
        live.delete(id);
      };

      for (const bar of bars) {
        if (closed) break;

        const high = Number(bar.h);
        const low = Number(bar.l);
        const open = Number(bar.o);
        const time = Number(bar.start_time);
        const reached = isLong ? high : low;
        const adverse = isLong ? low : high;

        if (stop !== null && (isLong ? adverse <= stop : adverse >= stop)) {
          const gapped = isLong ? open < stop : open > stop;
          const fillPrice = gapped ? open : stop;
          const quantity = parseFloat(
            (await getOpenPositions(accountId)).find(p => p.id === position.id)?.quantity ?? position.quantity
          );
          const result = await closePosition(accountId, position.symbol, fillPrice, undefined);
          events.push({
            symbol: position.symbol,
            side: position.side,
            kind: 'STOP',
            label: trailDistance !== null ? 'trailing stop' : 'stop',
            at: time,
            triggerPrice: stop,
            fillPrice,
            quantity,
            realizedPnL: result.realizedPnL,
            gapped,
          });
          for (const id of [...live.keys()]) {
            await db
              .update(positionOrders)
              .set({ status: 'CANCELLED', updated_at: new Date() })
              .where(eq(positionOrders.id, id));
          }
          closed = true;
          stopDirty = false;
          break;
        }

        for (const order of [...live.values()]) {
          const trigger = parseFloat(order.trigger_price);
          const hit = isLong ? reached >= trigger : reached <= trigger;
          if (!hit) continue;

          if (order.kind === 'TAKE_PROFIT') {
            const want = parseFloat(order.quantity ?? '0');
            const held = parseFloat(
              (await getOpenPositions(accountId)).find(p => p.id === position.id)?.quantity ?? '0'
            );
            const qty = Math.min(want, held);
            if (qty > 0) {
              const result = await closePosition(accountId, position.symbol, trigger, qty);
              events.push({
                symbol: position.symbol,
                side: position.side,
                kind: 'TAKE_PROFIT',
                label: order.label,
                at: time,
                triggerPrice: trigger,
                fillPrice: trigger,
                quantity: qty,
                realizedPnL: result.realizedPnL,
              });
            }
            await fire(order.id);
          } else if (order.kind === 'MOVE_STOP') {
            stop = parseFloat(order.new_stop ?? '0');
            stopDirty = true;
            events.push({
              symbol: position.symbol,
              side: position.side,
              kind: 'MOVE_STOP',
              label: order.label,
              at: time,
              triggerPrice: trigger,
              newStop: stop,
            });
            await fire(order.id);
          } else if (order.kind === 'TRAIL') {
            trailDistance = parseFloat(order.trail_distance ?? '0');
            events.push({
              symbol: position.symbol,
              side: position.side,
              kind: 'TRAIL',
              label: order.label,
              at: time,
              triggerPrice: trigger,
            });
            await fire(order.id);
          }
        }

        if (trailDistance !== null && trailDistance > 0) {
          const candidate = isLong ? high - trailDistance : low + trailDistance;
          if (stop === null || (isLong ? candidate > stop : candidate < stop)) {
            stop = candidate;
            stopDirty = true;
          }
        }
      }

      if (!closed && stopDirty && stop !== null) {
        await db
          .update(positions)
          .set({ stop_price: stop.toString(), updated_at: new Date() })
          .where(eq(positions.id, position.id));
      }
    }
  } finally {
    await db.execute(sql`select pg_advisory_unlock(hashtext(${accountId}))`);
  }

  return events;
}

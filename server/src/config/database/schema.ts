import { pgTable, uuid, text, numeric, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

function timestamps() {
  return {
    created_at: timestamp('created_at').defaultNow().notNull(), // Timestamp when the record was created
    updated_at: timestamp('updated_at').defaultNow().notNull(), // Timestamp when the record was last updated
  };
}

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the trading account
  initial_balance: numeric('initial_balance', { precision: 20, scale: 8 }).notNull(), // Starting balance when account was created
  current_balance: numeric('current_balance', { precision: 20, scale: 8 }).notNull(), // Current available cash balance (excluding unrealized PnL)
  total_pnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0').notNull(), // Total realized profit and loss from all closed positions
  // Calculated metrics that should be stored
  account_value: numeric('account_value', { precision: 20, scale: 8 }), // Total account value = current_balance + unrealized PnL from open positions
  crypto_value: numeric('crypto_value', { precision: 20, scale: 8 }).default('0'), // Total unrealized PnL from all open positions (value of crypto holdings)
  total_return_percent: numeric('total_return_percent', { precision: 10, scale: 4 }), // Percentage return: ((account_value - initial_balance) / initial_balance) * 100
  sharpe_ratio: numeric('sharpe_ratio', { precision: 10, scale: 6 }), // Risk-adjusted return metric calculated from order returns
  ...timestamps(),
});

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the position
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(), // Foreign key to the account owning this position
  symbol: text('symbol').notNull(), // Trading pair symbol (e.g., 'BTCUSDT', 'ETHUSDT')
  side: text('side').notNull(), // Position direction: 'BUY' (long) or 'SELL' (short)
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(), // Number of units held in this position
  entry_price: numeric('entry_price', { precision: 20, scale: 8 }).notNull(), // Average price at which the position was opened
  current_price: numeric('current_price', { precision: 20, scale: 8 }).notNull(), // Latest market price for the symbol (updated periodically)
  unrealized_pnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).default('0').notNull(), // Unrealized profit/loss based on current_price vs entry_price
  leverage: integer('leverage').default(1).notNull(), // Leverage multiplier (1 = no leverage)
  is_open: boolean('is_open').default(true).notNull(), // Whether the position is currently open (true) or closed (false)
  ...timestamps(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the order
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(), // Foreign key to the account placing this order
  agent_invocation_id: uuid('agent_invocation_id').references(() => agentInvocations.id, { onDelete: 'set null' }), // Optional reference to the agent invocation that created this order
  position_id: uuid('position_id').references(() => positions.id), // Optional reference to the position associated with this order (for closing orders)
  symbol: text('symbol').notNull(), // Trading pair symbol (e.g., 'BTCUSDT', 'ETHUSDT')
  side: text('side').notNull(), // Order direction: 'BUY' or 'SELL'
  order_type: text('order_type').notNull(), // Type of order: 'MARKET', 'LIMIT', 'STOP', etc.
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(), // Number of units to trade
  price: numeric('price', { precision: 20, scale: 8 }), // Limit price for limit orders (null for market orders)
  stop_price: numeric('stop_price', { precision: 20, scale: 8 }), // Stop price for stop-loss or stop-limit orders
  filled_price: numeric('filled_price', { precision: 20, scale: 8 }), // Actual price at which the order was executed (null if not filled)
  status: text('status').notNull().default('PENDING'), // Order status: 'PENDING', 'FILLED', 'CANCELLED', 'REJECTED', etc.
  realized_pnl: numeric('realized_pnl', { precision: 20, scale: 8 }), // Realized profit/loss when closing a position (null for opening orders)
  trade_value: numeric('trade_value', { precision: 20, scale: 8 }), // Monetary value of the trade: side === 'BUY' ? price * quantity : -price * quantity
  metadata: jsonb('metadata'), // Additional order metadata stored as JSON
  ...timestamps(),
});

export const agentInvocations = pgTable('agent_invocations', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the agent invocation
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(), // Foreign key to the account this invocation belongs to
  session_state: jsonb('session_state').notNull(), // Session state at the time of invocation (start time, invocation count, etc.)
  market_data: jsonb('market_data').notNull(), // Market data snapshot provided to the agent (prices, indicators, etc.)
  metrics: jsonb('metrics').notNull(), // Account metrics provided to the agent (balance, PnL, returns, etc.)
  user_prompt: text('user_prompt').notNull(), // The prompt/question sent to the agent
  chain_of_thought: text('chain_of_thought').notNull(), // Agent's reasoning and thought process
  agent_response: jsonb('agent_response'), // Agent's response including tool calls and decisions (null if invocation failed)
  finish_reason: text('finish_reason'), // Reason for completion: 'stop', 'length', 'tool_calls', 'error', etc.
  ...timestamps(),
});

// Historical snapshots of account values for time-series analysis
export const accountSnapshots = pgTable('account_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(), // Unique identifier for the snapshot
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(), // Foreign key to the account this snapshot belongs to
  account_value: numeric('account_value', { precision: 20, scale: 8 }).notNull(), // Total account value at snapshot time
  current_balance: numeric('current_balance', { precision: 20, scale: 8 }).notNull(), // Available cash balance at snapshot time
  crypto_value: numeric('crypto_value', { precision: 20, scale: 8 }).default('0').notNull(), // Total unrealized PnL from open positions at snapshot time
  total_pnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0').notNull(), // Total realized PnL at snapshot time
  total_return_percent: numeric('total_return_percent', { precision: 10, scale: 4 }), // Percentage return at snapshot time
  sharpe_ratio: numeric('sharpe_ratio', { precision: 10, scale: 6 }), // Sharpe ratio at snapshot time
  snapshot_at: timestamp('snapshot_at').defaultNow().notNull(), // Timestamp when this snapshot was taken
  ...timestamps(),
});

export type Account = typeof accounts.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type AgentInvocation = typeof agentInvocations.$inferSelect;
export type AccountSnapshot = typeof accountSnapshots.$inferSelect;

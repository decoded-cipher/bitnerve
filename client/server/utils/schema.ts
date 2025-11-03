import { pgTable, uuid, text, numeric, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

function timestamps() {
  return {
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  }
}

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  initial_balance: numeric('initial_balance', { precision: 20, scale: 8 }).notNull(),
  current_balance: numeric('current_balance', { precision: 20, scale: 8 }).notNull(),
  total_pnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0').notNull(),
  ...timestamps(),
})

export const agentInvocations = pgTable('agent_invocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  session_state: jsonb('session_state').notNull(),
  market_data: jsonb('market_data').notNull(),
  metrics: jsonb('metrics').notNull(),
  user_prompt: text('user_prompt').notNull(),
  chain_of_thought: text('chain_of_thought').notNull(),
  agent_response: jsonb('agent_response'),
  finish_reason: text('finish_reason'),
  ...timestamps(),
})

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
  entry_price: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
  current_price: numeric('current_price', { precision: 20, scale: 8 }).notNull(),
  unrealized_pnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).default('0').notNull(),
  leverage: integer('leverage').default(1).notNull(),
  is_open: boolean('is_open').default(true).notNull(),
  ...timestamps(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  agent_invocation_id: uuid('agent_invocation_id').references(() => agentInvocations.id, { onDelete: 'set null' }),
  position_id: uuid('position_id').references(() => positions.id),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  order_type: text('order_type').notNull(),
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
  price: numeric('price', { precision: 20, scale: 8 }),
  stop_price: numeric('stop_price', { precision: 20, scale: 8 }),
  filled_price: numeric('filled_price', { precision: 20, scale: 8 }),
  status: text('status').notNull().default('PENDING'),
  realized_pnl: numeric('realized_pnl', { precision: 20, scale: 8 }),
  metadata: jsonb('metadata'),
  ...timestamps(),
})

export type Account = typeof accounts.$inferSelect
export type Position = typeof positions.$inferSelect
export type Order = typeof orders.$inferSelect
export type AgentInvocation = typeof agentInvocations.$inferSelect

CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"account_value" numeric(20, 8) NOT NULL,
	"current_balance" numeric(20, 8) NOT NULL,
	"crypto_value" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_return_percent" numeric(10, 4),
	"sharpe_ratio" numeric(10, 6),
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initial_balance" numeric(20, 8) NOT NULL,
	"current_balance" numeric(20, 8) NOT NULL,
	"total_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"account_value" numeric(20, 8),
	"crypto_value" numeric(20, 8) DEFAULT '0',
	"total_return_percent" numeric(10, 4),
	"sharpe_ratio" numeric(10, 6),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"session_state" jsonb NOT NULL,
	"market_data" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"user_prompt" text NOT NULL,
	"chain_of_thought" text NOT NULL,
	"agent_response" jsonb,
	"finish_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"symbol" text PRIMARY KEY NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"agent_invocation_id" uuid,
	"position_id" uuid,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"order_type" text NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8),
	"stop_price" numeric(20, 8),
	"filled_price" numeric(20, 8),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"realized_pnl" numeric(20, 8),
	"trade_value" numeric(20, 8),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"current_price" numeric(20, 8) NOT NULL,
	"unrealized_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"leverage" integer DEFAULT 1 NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_invocations" ADD CONSTRAINT "agent_invocations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agent_invocation_id_agent_invocations_id_fk" FOREIGN KEY ("agent_invocation_id") REFERENCES "public"."agent_invocations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_snapshots_account_time" ON "account_snapshots" USING btree ("account_id","snapshot_at");--> statement-breakpoint
CREATE INDEX "idx_snapshots_time" ON "account_snapshots" USING btree ("snapshot_at");--> statement-breakpoint
CREATE INDEX "idx_accounts_created" ON "accounts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_invocations_account_created" ON "agent_invocations" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_invocations_created" ON "agent_invocations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_account_status" ON "orders" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_status_created" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_position" ON "orders" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_orders_invocation" ON "orders" USING btree ("agent_invocation_id");--> statement-breakpoint
CREATE INDEX "idx_positions_account_open" ON "positions" USING btree ("account_id","is_open");--> statement-breakpoint
CREATE INDEX "idx_positions_open_created" ON "positions" USING btree ("is_open","created_at");
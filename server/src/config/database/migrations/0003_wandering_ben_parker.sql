CREATE TABLE "position_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"trigger_price" numeric(20, 8) NOT NULL,
	"quantity" numeric(20, 8),
	"new_stop" numeric(20, 8),
	"trail_distance" numeric(20, 8),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "position_orders" ADD CONSTRAINT "position_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_orders" ADD CONSTRAINT "position_orders_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_position_orders_position" ON "position_orders" USING btree ("position_id","status");--> statement-breakpoint
CREATE INDEX "idx_position_orders_account" ON "position_orders" USING btree ("account_id","status");
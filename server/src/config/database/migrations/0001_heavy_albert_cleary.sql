ALTER TABLE "accounts" ADD COLUMN "provider" text DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "model_name" text DEFAULT 'claude-opus-5' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_model" ON "accounts" USING btree ("provider","model_name");
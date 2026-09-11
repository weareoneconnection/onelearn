CREATE TABLE `billing_customers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`provider_customer_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_provider_customer_unique` ON `billing_customers` (`provider`,`provider_customer_id`);--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`livemode` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_billing_events_processed` ON `billing_events` (`processed_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`provider_subscription_id` text,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'cny' NOT NULL,
	`status` text NOT NULL,
	`hosted_invoice_url` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_billing_invoices_user_created` ON `billing_invoices` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_billing_invoices_subscription` ON `billing_invoices` (`provider_subscription_id`);--> statement-breakpoint
CREATE TABLE `entitlement_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`metric` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entitlement_usage_user_month_metric_unique` ON `entitlement_usage` (`user_id`,`month`,`metric`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`provider_subscription_id` text NOT NULL,
	`provider_customer_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`billing_interval` text NOT NULL,
	`status` text NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_subscription_unique` ON `subscriptions` (`provider`,`provider_subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user_status` ON `subscriptions` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_customer` ON `subscriptions` (`provider_customer_id`);
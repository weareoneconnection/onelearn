CREATE TABLE `anonymous_usage_daily` (
	`client_key` text NOT NULL,
	`day` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`client_key`, `day`)
);
--> statement-breakpoint
DROP INDEX `users_email_unique`;--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);
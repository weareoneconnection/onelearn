CREATE TABLE `credit_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`credits` integer NOT NULL,
	`reason` text NOT NULL,
	`reference` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_grants_user_reason_reference_unique` ON `credit_grants` (`user_id`,`reason`,`reference`);--> statement-breakpoint
CREATE INDEX `idx_credit_grants_user_month` ON `credit_grants` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE `proof_shares` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proof_shares_user_unique` ON `proof_shares` (`user_id`);--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_code_unique` ON `referral_codes` (`code`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_user_id` text NOT NULL,
	`invitee_user_id` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_invitee_unique` ON `referrals` (`invitee_user_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer` ON `referrals` (`referrer_user_id`,`created_at`);
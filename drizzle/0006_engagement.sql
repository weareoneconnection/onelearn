CREATE TABLE `diagnostics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_version_id` text NOT NULL,
	`questions_json` text NOT NULL,
	`answers_json` text,
	`known_modules_json` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diagnostics_user_course_unique` ON `diagnostics` (`user_id`,`course_version_id`);--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `email_reminders` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `last_reminded_at` integer;
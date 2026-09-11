CREATE TABLE `voice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_version_id` text,
	`lesson_id` text,
	`month` text NOT NULL,
	`reserved_seconds` integer NOT NULL,
	`used_seconds` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_voice_sessions_user_started` ON `voice_sessions` (`user_id`,`started_at`);
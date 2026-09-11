CREATE TABLE `mastery_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_version_id` text NOT NULL,
	`node_key` text NOT NULL,
	`node_title` text NOT NULL,
	`understanding` real DEFAULT 0 NOT NULL,
	`recall` real DEFAULT 0 NOT NULL,
	`application` real DEFAULT 0 NOT NULL,
	`transfer` real DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_attempts` integer DEFAULT 0 NOT NULL,
	`unassisted_passes` integer DEFAULT 0 NOT NULL,
	`review_passes` integer DEFAULT 0 NOT NULL,
	`stability_days` real DEFAULT 1 NOT NULL,
	`first_pass_at` integer,
	`last_evidence_at` integer,
	`next_review_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mastery_records_user_course_node_unique` ON `mastery_records` (`user_id`,`course_version_id`,`node_key`);--> statement-breakpoint
CREATE INDEX `idx_mastery_records_user_review` ON `mastery_records` (`user_id`,`next_review_at`);
CREATE TABLE `lesson_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_version_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`lesson_json` text NOT NULL,
	`response_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_version_id`) REFERENCES `course_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_contents_course_lesson_unique` ON `lesson_contents` (`course_version_id`,`lesson_id`);
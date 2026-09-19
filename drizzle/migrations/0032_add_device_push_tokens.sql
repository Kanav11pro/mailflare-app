-- Mobile device push notification tokens.
CREATE TABLE IF NOT EXISTS `device_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`token` text NOT NULL,
	`platform` text DEFAULT 'android' NOT NULL,
	`device_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `device_push_tokens_user_token_idx` ON `device_push_tokens` (`user_id`, `token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `device_push_tokens_user_idx` ON `device_push_tokens` (`user_id`);

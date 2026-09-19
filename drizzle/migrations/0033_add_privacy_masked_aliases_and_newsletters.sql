-- Masked / Disposable burner aliases and Privacy Shield / Newsletter tracking.
CREATE TABLE IF NOT EXISTS `masked_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`mailbox_id` text NOT NULL REFERENCES `mailboxes`(`id`) ON DELETE cascade,
	`domain_id` text NOT NULL REFERENCES `domains`(`id`) ON DELETE cascade,
	`local_part` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`forward_count` integer DEFAULT 0 NOT NULL,
	`blocked_count` integer DEFAULT 0 NOT NULL,
	`last_received_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `masked_aliases_address_idx` ON `masked_aliases` (`domain_id`, `local_part`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `masked_aliases_user_idx` ON `masked_aliases` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `masked_aliases_mailbox_idx` ON `masked_aliases` (`mailbox_id`);--> statement-breakpoint
ALTER TABLE `messages` ADD `trackers_blocked_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `trackers_blocked_domains` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `unsubscribe_url` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `unsubscribe_mailto` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `is_newsletter` integer DEFAULT false NOT NULL;

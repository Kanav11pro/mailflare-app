-- Outbound Delivery Telemetry, Latency Metrics & Engagement Tracking
ALTER TABLE `messages` ADD `delivery_status` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `delivery_latency_ms` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `delivery_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `delivery_error` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `delivery_bounce_type` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `opened_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `open_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `clicked_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `click_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `last_clicked_url` text;

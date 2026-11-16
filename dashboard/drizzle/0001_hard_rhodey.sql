CREATE TABLE `cloud_records` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`record_id` text NOT NULL,
	`revision` integer NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);

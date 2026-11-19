CREATE TABLE `funding_records` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`funder` text NOT NULL,
	`status` text NOT NULL,
	`date` text,
	`summary` text NOT NULL,
	`url` text,
	`reference` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `funding_source_date` ON `funding_records` (`source`,`date`);
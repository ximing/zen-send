ALTER TABLE `notes` ADD `shareToken` varchar(32);--> statement-breakpoint
ALTER TABLE `notes` ADD `isShared` tinyint DEFAULT 0 NOT NULL;
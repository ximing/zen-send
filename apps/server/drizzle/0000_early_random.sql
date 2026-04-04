CREATE TABLE `chunkUploads` (
	`id` varchar(24) NOT NULL,
	`sessionId` varchar(24) NOT NULL,
	`chunkIndex` int NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`etag` varchar(100),
	`uploadedAt` int NOT NULL,
	CONSTRAINT `chunkUploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` varchar(24) NOT NULL,
	`userId` varchar(24) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(20) NOT NULL,
	`lastSeenAt` int NOT NULL,
	`isOnline` tinyint NOT NULL DEFAULT 0,
	`createdAt` int NOT NULL,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transferItems` (
	`id` varchar(24) NOT NULL,
	`sessionId` varchar(24) NOT NULL,
	`type` varchar(20) NOT NULL,
	`name` varchar(255),
	`mimeType` varchar(100),
	`size` bigint NOT NULL,
	`content` text,
	`thumbnailKey` varchar(500),
	`createdAt` int NOT NULL,
	CONSTRAINT `transferItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transferSessions` (
	`id` varchar(24) NOT NULL,
	`userId` varchar(24) NOT NULL,
	`sourceDeviceId` varchar(24) NOT NULL,
	`targetDeviceId` varchar(24),
	`status` varchar(20) NOT NULL,
	`s3Bucket` varchar(100) NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`totalSize` bigint NOT NULL,
	`chunkCount` int NOT NULL,
	`receivedChunks` int NOT NULL DEFAULT 0,
	`contentType` varchar(100) NOT NULL,
	`ttlExpiresAt` int NOT NULL,
	`createdAt` int NOT NULL,
	`completedAt` int,
	CONSTRAINT `transferSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(24) NOT NULL,
	`email` varchar(255) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` int NOT NULL,
	`updatedAt` int NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

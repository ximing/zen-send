CREATE TABLE `notes` (
	`id` varchar(24) NOT NULL,
	`userId` varchar(24) NOT NULL,
	`title` varchar(100) NOT NULL DEFAULT '未命名笔记',
	`content` text NOT NULL DEFAULT (''),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` int NOT NULL,
	`updatedAt` int NOT NULL,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);

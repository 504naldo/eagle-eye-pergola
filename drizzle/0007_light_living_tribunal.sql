CREATE TABLE `qto_line_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`lineKey` varchar(255) NOT NULL,
	`customQuantity` decimal(10,2),
	`customUnit` varchar(50),
	`customDescription` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qto_line_overrides_id` PRIMARY KEY(`id`)
);

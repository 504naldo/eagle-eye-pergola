CREATE TABLE `rate_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`rates` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_overrides_projectId_unique` UNIQUE(`projectId`)
);

CREATE TABLE `renderings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`prompt` text NOT NULL,
	`style` varchar(100) NOT NULL DEFAULT 'photorealistic',
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `renderings_id` PRIMARY KEY(`id`)
);

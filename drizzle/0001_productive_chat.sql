CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`label` varchar(500) NOT NULL,
	`checked` boolean DEFAULT false,
	`fieldNote` text,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_params` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`widthFt` decimal(8,2) DEFAULT '58.00',
	`depthFt` decimal(8,2) DEFAULT '15.67',
	`heightFt` decimal(8,2) DEFAULT '10.00',
	`postCount` int DEFAULT 5,
	`postSpacingFt` decimal(8,2) DEFAULT '14.50',
	`slatType` enum('fixed','operable') NOT NULL DEFAULT 'fixed',
	`slatSpacingIn` decimal(6,2) DEFAULT '4.00',
	`glassFront` boolean DEFAULT true,
	`glassLeft` boolean DEFAULT true,
	`glassRight` boolean DEFAULT true,
	`connectionType` enum('wall_mounted_lean_to') NOT NULL DEFAULT 'wall_mounted_lean_to',
	`finishColor` varchar(100) DEFAULT 'Matte Black',
	`ledLighting` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_params_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_params_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`clientName` varchar(255),
	`location` varchar(500),
	`status` enum('draft','in_review','approved','archived') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scope_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('inclusion','exclusion','assumption','by_others') NOT NULL,
	`text` text NOT NULL,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `scope_items_id` PRIMARY KEY(`id`)
);

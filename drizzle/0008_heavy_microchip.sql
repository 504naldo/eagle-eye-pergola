CREATE TABLE `phased_enclosure_params` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`approvedDrawingUrl` text,
	`approvedDrawingFileKey` varchar(500),
	`approvedDrawingName` varchar(255),
	`approvedDrawingLocked` boolean DEFAULT true,
	`scopeMode` enum('phase1Only','phase2Only','fullBuildout','compare') DEFAULT 'fullBuildout',
	`phase1Json` json,
	`phase2Json` json,
	`dimensionsJson` json,
	`pricingJson` json,
	`fieldNotesJson` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phased_enclosure_params_id` PRIMARY KEY(`id`),
	CONSTRAINT `phased_enclosure_params_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `scopeType` enum('pergola','canopy','enclosure','fencing','phasedEnclosure') NOT NULL DEFAULT 'pergola';
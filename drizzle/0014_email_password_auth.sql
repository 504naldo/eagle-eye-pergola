-- Make openId nullable (was NOT NULL) to support email+password users without an OAuth identity
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NULL;

-- Add password hash column for local email+password authentication
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255) NULL;

-- Add unique index on email so it can be used as a login identifier
ALTER TABLE `users` ADD UNIQUE INDEX `users_email_unique` (`email`);

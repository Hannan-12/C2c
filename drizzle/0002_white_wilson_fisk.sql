CREATE TABLE `admin_users` (
	`id` char(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(200),
	`active` boolean NOT NULL DEFAULT true,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
);

ALTER TABLE `bookings` ADD `city` enum('dubai','abu_dhabi','sharjah');--> statement-breakpoint
ALTER TABLE `drivers` ADD `city` enum('dubai','abu_dhabi','sharjah') DEFAULT 'dubai' NOT NULL;
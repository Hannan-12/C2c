CREATE TABLE `booking_notes` (
	`id` char(36) NOT NULL,
	`booking_id` char(36) NOT NULL,
	`author_email` varchar(320) NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `booking_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_reason` enum('customer_early','customer_late','customer_no_show','we_cancelled','duplicate','other');--> statement-breakpoint
ALTER TABLE `booking_notes` ADD CONSTRAINT `booking_notes_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_notes_booking_idx` ON `booking_notes` (`booking_id`);
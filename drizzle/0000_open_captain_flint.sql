CREATE TABLE `booking_assignments` (
	`id` char(36) NOT NULL,
	`booking_id` char(36) NOT NULL,
	`driver_id` char(36) NOT NULL,
	`assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`notes` text,
	CONSTRAINT `booking_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` char(36) NOT NULL,
	`reference_code` varchar(16) NOT NULL,
	`service_type` enum('ride','hourly','city_tour','airport','courier') NOT NULL,
	`pickup_location` varchar(500) NOT NULL,
	`pickup_lat` decimal(10,7),
	`pickup_lng` decimal(10,7),
	`dropoff_location` varchar(500),
	`dropoff_lat` decimal(10,7),
	`dropoff_lng` decimal(10,7),
	`stops` json,
	`pickup_datetime` datetime NOT NULL,
	`duration_hours` int,
	`flight_number` varchar(20),
	`vehicle_category` enum('comfort','business','suv','vip','van') NOT NULL,
	`passenger_count` int NOT NULL,
	`luggage_count` int NOT NULL DEFAULT 0,
	`distance_km` decimal(8,2),
	`duration_min` int,
	`fare_estimate` decimal(10,2),
	`customer_name` varchar(200) NOT NULL,
	`customer_whatsapp` varchar(30) NOT NULL,
	`customer_email` varchar(320),
	`status` enum('requested','confirmed','assigned','en_route','completed','cancelled') NOT NULL DEFAULT 'requested',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_reference_code_unique` UNIQUE(`reference_code`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` char(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`whatsapp_number` varchar(30) NOT NULL,
	`vehicle_assigned` varchar(200),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `booking_assignments` ADD CONSTRAINT `booking_assignments_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_assignments` ADD CONSTRAINT `booking_assignments_driver_id_drivers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignments_booking_idx` ON `booking_assignments` (`booking_id`);--> statement-breakpoint
CREATE INDEX `assignments_driver_idx` ON `booking_assignments` (`driver_id`);--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `bookings_pickup_datetime_idx` ON `bookings` (`pickup_datetime`);--> statement-breakpoint
CREATE INDEX `bookings_created_at_idx` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE INDEX `drivers_active_idx` ON `drivers` (`active`);
ALTER TABLE `bookings` ADD `payment_method` enum('cash','card') DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_status` enum('not_required','pending','paid','refunded') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `stripe_session_id` varchar(255);--> statement-breakpoint
ALTER TABLE `bookings` ADD `stripe_payment_intent_id` varchar(255);--> statement-breakpoint
ALTER TABLE `bookings` ADD `amount_paid` decimal(10,2);--> statement-breakpoint
ALTER TABLE `bookings` ADD `paid_at` datetime;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_stripe_session_id_unique` UNIQUE(`stripe_session_id`);
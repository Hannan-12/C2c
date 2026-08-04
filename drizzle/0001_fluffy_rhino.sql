CREATE TABLE `vehicle_pricing` (
	`category` enum('comfort','business','suv','vip','van') NOT NULL,
	`base_fare` decimal(10,2) NOT NULL,
	`per_km` decimal(10,2) NOT NULL,
	`per_min` decimal(10,2) NOT NULL,
	`minimum_fare` decimal(10,2) NOT NULL,
	`hourly_rate` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'AED',
	`active` boolean NOT NULL DEFAULT true,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_pricing_category` PRIMARY KEY(`category`)
);

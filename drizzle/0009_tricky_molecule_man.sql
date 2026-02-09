CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entity_type` varchar(64),
	`entity_id` int,
	`details` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);

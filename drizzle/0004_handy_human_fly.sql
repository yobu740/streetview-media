CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('reservation_pending','reservation_approved','reservation_rejected') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`related_id` int,
	`read` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `anuncios` ADD `approval_status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `anuncios` ADD `created_by` int;--> statement-breakpoint
ALTER TABLE `anuncios` ADD `approved_by` int;--> statement-breakpoint
ALTER TABLE `anuncios` ADD `approved_at` timestamp;
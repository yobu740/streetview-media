ALTER TABLE `seguimientos` MODIFY COLUMN `anuncio_id` int;--> statement-breakpoint
ALTER TABLE `seguimientos` ADD `telefono` varchar(30);--> statement-breakpoint
ALTER TABLE `seguimientos` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `seguimientos` ADD `archived_at` timestamp;
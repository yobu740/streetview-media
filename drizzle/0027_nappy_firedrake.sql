ALTER TABLE `notifications` ADD `ignorada` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `related_anuncio_id` int;
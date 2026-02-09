ALTER TABLE `paradas` ADD `condicion_pintada` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `paradas` ADD `condicion_arreglada` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `paradas` ADD `condicion_limpia` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `paradas` ADD `display_publicidad` enum('Si','No','N/A') DEFAULT 'N/A' NOT NULL;
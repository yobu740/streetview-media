ALTER TABLE `cotizaciones` ADD `paradas_data` text;--> statement-breakpoint
ALTER TABLE `cotizaciones` ADD `estado` enum('Pendiente','Aprobada','Rechazada') DEFAULT 'Pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE `cotizaciones` ADD `admin_comment` text;--> statement-breakpoint
ALTER TABLE `cotizaciones` ADD `approved_at` timestamp;--> statement-breakpoint
ALTER TABLE `cotizaciones` ADD `approved_by` int;
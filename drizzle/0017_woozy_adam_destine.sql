ALTER TABLE `facturas` ADD `estado_pago` enum('Pendiente','Pagada','Vencida') DEFAULT 'Pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE `facturas` ADD `fecha_pago` timestamp;
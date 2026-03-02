CREATE TABLE `pagos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`factura_id` int NOT NULL,
	`monto` varchar(20) NOT NULL,
	`fecha_pago` timestamp NOT NULL,
	`metodo_pago` enum('Efectivo','Transferencia','Cheque','Tarjeta','Otro') NOT NULL DEFAULT 'Transferencia',
	`notas` text,
	`registrado_por` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pagos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `facturas` MODIFY COLUMN `estado_pago` enum('Pendiente','Pagada','Vencida','Pago Parcial') NOT NULL DEFAULT 'Pendiente';
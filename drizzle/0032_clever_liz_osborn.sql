CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`es_agencia` int NOT NULL DEFAULT 0,
	`direccion` text,
	`ciudad` varchar(100),
	`estado` varchar(100),
	`codigo_postal` varchar(20),
	`email` varchar(320),
	`telefono` varchar(30),
	`contacto_principal` varchar(255),
	`notas` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contrato_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contrato_id` int NOT NULL,
	`cantidad` int NOT NULL DEFAULT 1,
	`concepto` varchar(255) NOT NULL,
	`precio_por_unidad` varchar(20),
	`total` varchar(20),
	`orden` int NOT NULL DEFAULT 0,
	CONSTRAINT `contrato_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contratos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cliente_id` int NOT NULL,
	`numero_contrato` varchar(64) NOT NULL,
	`numero_po` varchar(64),
	`fecha` timestamp NOT NULL,
	`customer_id` varchar(255),
	`sales_duration` varchar(255),
	`vendedor` varchar(255),
	`metodo_pago` varchar(100) DEFAULT 'ACH / Wire Transfer',
	`fecha_vencimiento` timestamp,
	`subtotal` varchar(20),
	`total` varchar(20),
	`notas` text,
	`pdf_url` text,
	`estado` enum('Borrador','Enviado','Firmado','Cancelado') NOT NULL DEFAULT 'Borrador',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contratos_id` PRIMARY KEY(`id`)
);

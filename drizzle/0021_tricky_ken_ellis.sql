CREATE TABLE `notas_cliente` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seguimiento_id` int NOT NULL,
	`vendedor_id` int NOT NULL,
	`vendedor_nombre` varchar(255),
	`nota` text NOT NULL,
	`tipo_contacto` enum('Llamada','Email','Reunión','WhatsApp','Otro') NOT NULL DEFAULT 'Llamada',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notas_cliente_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seguimientos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anuncio_id` int NOT NULL,
	`vendedor_id` int NOT NULL,
	`cliente` varchar(255) NOT NULL,
	`producto` varchar(255),
	`fecha_vencimiento` timestamp NOT NULL,
	`estado` enum('Pendiente','Contactado','Interesado','Renovado','No Renovará') NOT NULL DEFAULT 'Pendiente',
	`fecha_contacto` timestamp,
	`proximo_seguimiento` timestamp,
	`resultado` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seguimientos_id` PRIMARY KEY(`id`)
);

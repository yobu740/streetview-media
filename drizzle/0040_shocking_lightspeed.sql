CREATE TABLE `cotizaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cotizacion_number` varchar(64) NOT NULL,
	`empresa` varchar(255) NOT NULL,
	`contacto` varchar(255) NOT NULL,
	`email` varchar(320),
	`vendedor_id` int NOT NULL,
	`vendedor_name` varchar(255),
	`fecha_inicio` varchar(32),
	`fecha_fin` varchar(32),
	`meses` int,
	`descuento` int DEFAULT 0,
	`total_mensual` int DEFAULT 0,
	`total_campana` int DEFAULT 0,
	`paradas_count` int DEFAULT 0,
	`pdf_url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cotizaciones_id` PRIMARY KEY(`id`)
);

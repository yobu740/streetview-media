CREATE TABLE `instalaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anuncio_id` int NOT NULL,
	`parada_id` int NOT NULL,
	`estado` enum('Programado','Relocalizacion','Instalado') NOT NULL DEFAULT 'Programado',
	`foto_instalacion` text,
	`instalado_at` timestamp,
	`instalado_por` varchar(255),
	`notas` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instalaciones_id` PRIMARY KEY(`id`)
);

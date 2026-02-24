CREATE TABLE `anuncio_historial` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anuncio_id` int NOT NULL,
	`user_id` int,
	`user_name` varchar(255),
	`accion` varchar(100) NOT NULL,
	`campo_modificado` varchar(100),
	`valor_anterior` text,
	`valor_nuevo` text,
	`detalles` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anuncio_historial_id` PRIMARY KEY(`id`)
);

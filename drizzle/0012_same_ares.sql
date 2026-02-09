CREATE TABLE `mantenimiento_historial` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parada_id` int NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(255),
	`campo_modificado` varchar(64) NOT NULL,
	`valor_anterior` varchar(64),
	`valor_nuevo` varchar(64) NOT NULL,
	`notas` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mantenimiento_historial_id` PRIMARY KEY(`id`)
);

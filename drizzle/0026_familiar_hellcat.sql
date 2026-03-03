CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`mensaje` text NOT NULL,
	`tipo` enum('info','alerta','exito','urgente') NOT NULL DEFAULT 'info',
	`activo` int NOT NULL DEFAULT 1,
	`fecha_inicio` timestamp,
	`fecha_fin` timestamp,
	`creado_por` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);

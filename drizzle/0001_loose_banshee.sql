CREATE TABLE `anuncios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parada_id` int NOT NULL,
	`cliente` varchar(255) NOT NULL,
	`tipo` enum('Fijo','Bonificación') NOT NULL,
	`fecha_inicio` timestamp NOT NULL,
	`fecha_fin` timestamp NOT NULL,
	`estado` enum('Activo','Programado','Finalizado') NOT NULL DEFAULT 'Activo',
	`notas` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `anuncios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paradas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cobertizo_id` varchar(64) NOT NULL,
	`localizacion` varchar(255) NOT NULL,
	`direccion` text NOT NULL,
	`orientacion` varchar(10),
	`flow_cat` varchar(64),
	`ruta` varchar(64),
	`coordenadas_lat` varchar(32),
	`coordenadas_lng` varchar(32),
	`tipo_formato` enum('Fija','Digital') NOT NULL DEFAULT 'Fija',
	`activa` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paradas_id` PRIMARY KEY(`id`),
	CONSTRAINT `paradas_cobertizo_id_unique` UNIQUE(`cobertizo_id`)
);

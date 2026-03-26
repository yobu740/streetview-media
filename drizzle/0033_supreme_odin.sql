CREATE TABLE `contrato_exhibit_a` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contrato_id` int NOT NULL,
	`localizacion` varchar(255) NOT NULL DEFAULT '',
	`cobertizo` varchar(64) NOT NULL DEFAULT '',
	`direccion` varchar(512) NOT NULL DEFAULT '',
	`iop` varchar(10) DEFAULT '',
	`producto` varchar(255) DEFAULT '',
	`fb` varchar(10) DEFAULT '',
	`orden` int NOT NULL DEFAULT 0,
	CONSTRAINT `contrato_exhibit_a_id` PRIMARY KEY(`id`)
);

CREATE TABLE `facturas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero_factura` varchar(64) NOT NULL,
	`cliente` varchar(255) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descripcion` text,
	`subtotal` varchar(20) NOT NULL,
	`costo_produccion` varchar(20),
	`otros_servicios_descripcion` varchar(255),
	`otros_servicios_costo` varchar(20),
	`total` varchar(20) NOT NULL,
	`vendedor` varchar(255),
	`pdf_url` text NOT NULL,
	`cantidad_anuncios` int NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facturas_id` PRIMARY KEY(`id`),
	CONSTRAINT `facturas_numero_factura_unique` UNIQUE(`numero_factura`)
);

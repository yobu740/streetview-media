ALTER TABLE `contrato_items` ADD `is_produccion` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `po_document_url` text;--> statement-breakpoint
ALTER TABLE `contratos` ADD `num_meses` int DEFAULT 1;
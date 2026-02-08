ALTER TABLE `paradas` DROP INDEX `paradas_cobertizo_id_unique`;--> statement-breakpoint
ALTER TABLE `paradas` MODIFY COLUMN `orientacion` varchar(10) NOT NULL;
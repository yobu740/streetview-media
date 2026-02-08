import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "vendedor"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Paradas de guagua (bus shelters) table
 */
export const paradas = mysqlTable("paradas", {
  id: int("id").autoincrement().primaryKey(),
  cobertizoId: varchar("cobertizo_id", { length: 64 }).notNull(), // #COB. from Excel - can have duplicates with different orientacion
  localizacion: varchar("localizacion", { length: 255 }).notNull(), // LOCALIZACIÓN
  direccion: text("direccion").notNull(), // DIRECCION
  orientacion: varchar("orientacion", { length: 10 }).notNull(), // I/O/P - required for uniqueness
  flowCat: varchar("flow_cat", { length: 64 }), // FLOW CAT
  ruta: varchar("ruta", { length: 64 }), // RUTA
  coordenadasLat: varchar("coordenadas_lat", { length: 32 }), // Latitude
  coordenadasLng: varchar("coordenadas_lng", { length: 32 }), // Longitude
  tipoFormato: mysqlEnum("tipo_formato", ["Fija", "Digital"]).default("Fija").notNull(),
  fotoUrl: text("foto_url"), // URL de la foto de la parada
  producto: varchar("producto", { length: 255 }), // PRODUCTO from Excel - current ad/product name
  cliente: varchar("cliente", { length: 255 }), // CLIENTE from Excel - client name (can be empty)
  activa: int("activa").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Parada = typeof paradas.$inferSelect;
export type InsertParada = typeof paradas.$inferInsert;

/**
 * Anuncios (advertisements) running on paradas
 */
export const anuncios = mysqlTable("anuncios", {
  id: int("id").autoincrement().primaryKey(),
  paradaId: int("parada_id").notNull(), // FK to paradas
  cliente: varchar("cliente", { length: 255 }).notNull(), // Client/Product name
  tipo: mysqlEnum("tipo", ["Fijo", "Bonificación"]).notNull(), // F/B from Excel
  fechaInicio: timestamp("fecha_inicio").notNull(), // Start date
  fechaFin: timestamp("fecha_fin").notNull(), // End date
  estado: mysqlEnum("estado", ["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).default("Activo").notNull(),
  // Approval workflow fields
  approvalStatus: mysqlEnum("approval_status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdBy: int("created_by"), // FK to users - who created the reservation
  approvedBy: int("approved_by"), // FK to users - admin who approved/rejected
  approvedAt: timestamp("approved_at"), // When it was approved/rejected
  notas: text("notas"), // Additional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Anuncio = typeof anuncios.$inferSelect;
export type InsertAnuncio = typeof anuncios.$inferInsert;
/**
 * Notifications table for admin alerts
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(), // FK to users - recipient
  type: mysqlEnum("type", ["reservation_pending", "reservation_approved", "reservation_rejected"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("related_id"), // FK to anuncios or other entities
  read: int("read").default(0).notNull(), // 0 = unread, 1 = read
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

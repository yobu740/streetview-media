import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  // Condition fields
  condicionPintada: int("condicion_pintada").default(0).notNull(), // 1 = pintada, 0 = no pintada
  condicionArreglada: int("condicion_arreglada").default(0).notNull(), // 1 = arreglada, 0 = no arreglada
  condicionLimpia: int("condicion_limpia").default(0).notNull(), // 1 = limpia, 0 = no limpia
  displayPublicidad: mysqlEnum("display_publicidad", ["Si", "No", "N/A"]).default("N/A").notNull(), // Display status
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
  producto: varchar("producto", { length: 255 }).notNull(), // Product/Ad name
  cliente: varchar("cliente", { length: 255 }).notNull(), // Client company name
  tipo: mysqlEnum("tipo", ["Fijo", "Bonificación"]).notNull(), // F/B from Excel
  costoPorUnidad: varchar("costo_por_unidad", { length: 20 }), // Cost per unit (stored as string to avoid Drizzle decimal bug)
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

/**
 * Activity log table to track user actions
 */
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(), // FK to users
  action: varchar("action", { length: 255 }).notNull(), // Action description (e.g., "Creó anuncio", "Exportó Excel")
  entityType: varchar("entity_type", { length: 64 }), // Type of entity affected (e.g., "anuncio", "parada")
  entityId: int("entity_id"), // ID of affected entity
  details: text("details"), // Additional JSON details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Mantenimiento history table to track condition changes
 */
export const mantenimientoHistorial = mysqlTable("mantenimiento_historial", {
  id: int("id").autoincrement().primaryKey(),
  paradaId: int("parada_id").notNull(), // FK to paradas
  userId: int("user_id"), // FK to users - who made the change
  userName: varchar("user_name", { length: 255 }), // User name for display
  campoModificado: varchar("campo_modificado", { length: 100 }).notNull(), // Field that was modified
  valorAnterior: varchar("valor_anterior", { length: 255 }), // Previous value
  valorNuevo: varchar("valor_nuevo", { length: 255 }), // New value
  notas: text("notas"), // Optional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MantenimientoHistorial = typeof mantenimientoHistorial.$inferSelect;
export type InsertMantenimientoHistorial = typeof mantenimientoHistorial.$inferInsert;

/**
 * Facturas (invoices) history table
 */
export const facturas = mysqlTable("facturas", {
  id: int("id").autoincrement().primaryKey(),
  numeroFactura: varchar("numero_factura", { length: 64 }).notNull().unique(), // INV-timestamp
  cliente: varchar("cliente", { length: 255 }).notNull(), // Client name
  titulo: varchar("titulo", { length: 255 }).notNull(), // Invoice title
  descripcion: text("descripcion"), // Optional description
  subtotal: varchar("subtotal", { length: 20 }).notNull(), // Subtotal from anuncios
  costoProduccion: varchar("costo_produccion", { length: 20 }), // Production cost
  otrosServiciosDescripcion: varchar("otros_servicios_descripcion", { length: 255 }), // Other services description
  otrosServiciosCosto: varchar("otros_servicios_costo", { length: 20 }), // Other services cost
  total: varchar("total", { length: 20 }).notNull(), // Final total
  vendedor: varchar("vendedor", { length: 255 }), // Salesperson name
  pdfUrl: text("pdf_url").notNull(), // S3 URL to PDF
  cantidadAnuncios: int("cantidad_anuncios").notNull(), // Number of anuncios in invoice
  estadoPago: mysqlEnum("estado_pago", ["Pendiente", "Pagada", "Vencida"]).default("Pendiente").notNull(), // Payment status
  fechaPago: timestamp("fecha_pago"), // Payment date (null if not paid)
  createdBy: int("created_by").notNull(), // FK to users - who created the invoice
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Factura = typeof facturas.$inferSelect;
export type InsertFactura = typeof facturas.$inferInsert;

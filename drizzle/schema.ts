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
  enConstruccion: int("en_construccion").default(0).notNull(), // 1 = en construccion, 0 = normal
  fechaDisponibilidad: timestamp("fecha_disponibilidad"), // Estimated availability date when en construccion
  removida: int("removida").default(0).notNull(), // 1 = removida (physically removed), 0 = normal
  fechaRetorno: timestamp("fecha_retorno"), // Estimated return date when removida
  destacada: int("destacada").default(0).notNull(), // 1 = destacada (profitable/featured), 0 = normal
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
  type: mysqlEnum("type", ["reservation_pending", "reservation_approved", "reservation_rejected", "invoice_overdue", "client_no_invoice", "campaign_ending_21d", "campaign_ending_14d", "campaign_ending_7d"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("related_id"), // FK to anuncios or other entities
  read: int("read").default(0).notNull(), // 0 = unread, 1 = read
  ignorada: int("ignorada").default(0).notNull(), // 0 = active, 1 = ignored/dismissed
  relatedAnuncioId: int("related_anuncio_id"), // FK to anuncios (for campaign_ending notifications)
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
  estadoPago: mysqlEnum("estado_pago", ["Pendiente", "Pagada", "Vencida", "Pago Parcial"]).default("Pendiente").notNull(), // Payment status
  fechaPago: timestamp("fecha_pago"), // Payment date (null if not paid)
  archivada: int("archivada").default(0).notNull(), // 1 = archived, 0 = active
  createdBy: int("created_by").notNull(), // FK to users - who created the invoice
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Factura = typeof facturas.$inferSelect;
export type InsertFactura = typeof facturas.$inferInsert;

/**
 * Anuncio history table to track all changes to advertisements
 */
export const anuncioHistorial = mysqlTable("anuncio_historial", {
  id: int("id").autoincrement().primaryKey(),
  anuncioId: int("anuncio_id").notNull(), // FK to anuncios
  userId: int("user_id"), // FK to users - who made the change
  userName: varchar("user_name", { length: 255 }), // User name for display
  accion: varchar("accion", { length: 100 }).notNull(), // Action type: "Creado", "Estado cambiado", "Ubicación cambiada", "Editado", "Eliminado"
  campoModificado: varchar("campo_modificado", { length: 100 }), // Field that was modified (if applicable)
  valorAnterior: text("valor_anterior"), // Previous value (JSON or string)
  valorNuevo: text("valor_nuevo"), // New value (JSON or string)
  detalles: text("detalles"), // Additional details or notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnuncioHistorial = typeof anuncioHistorial.$inferSelect;
export type InsertAnuncioHistorial = typeof anuncioHistorial.$inferInsert;

/**
 * Client follow-ups table for CRM system
 */
export const seguimientos = mysqlTable("seguimientos", {
  id: int("id").autoincrement().primaryKey(),
  anuncioId: int("anuncio_id"), // FK to anuncios - optional (null for manually created seguimientos)
  vendedorId: int("vendedor_id").notNull(), // FK to users - assigned salesperson
  cliente: varchar("cliente", { length: 255 }).notNull(), // Client name
  producto: varchar("producto", { length: 255 }), // Product/campaign name
  telefono: varchar("telefono", { length: 30 }), // Client phone number
  email: varchar("email", { length: 255 }), // Client email
  fechaVencimiento: timestamp("fecha_vencimiento").notNull(), // Campaign end date
  estado: mysqlEnum("estado", ["Pendiente", "Contactado", "Interesado", "Renovado", "No Renovará"]).default("Pendiente").notNull(),
  fechaContacto: timestamp("fecha_contacto"), // When client was contacted
  proximoSeguimiento: timestamp("proximo_seguimiento"), // Next scheduled follow-up
  resultado: text("resultado"), // Result of last contact
  archivedAt: timestamp("archived_at"), // When it was archived (null = active)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Seguimiento = typeof seguimientos.$inferSelect;
export type InsertSeguimiento = typeof seguimientos.$inferInsert;

/**
 * Client conversation notes table
 */
export const notasCliente = mysqlTable("notas_cliente", {
  id: int("id").autoincrement().primaryKey(),
  seguimientoId: int("seguimiento_id").notNull(), // FK to seguimientos
  vendedorId: int("vendedor_id").notNull(), // FK to users - who wrote the note
  vendedorNombre: varchar("vendedor_nombre", { length: 255 }), // Salesperson name for display
  nota: text("nota").notNull(), // Conversation notes
  tipoContacto: mysqlEnum("tipo_contacto", ["Llamada", "Email", "Reunión", "WhatsApp", "Otro"]).default("Llamada").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotaCliente = typeof notasCliente.$inferSelect;
export type InsertNotaCliente = typeof notasCliente.$inferInsert;

/**
 * Pagos (partial payments / abonos) table for invoices
 */
export const pagos = mysqlTable("pagos", {
  id: int("id").autoincrement().primaryKey(),
  facturaId: int("factura_id").notNull(), // FK to facturas
  monto: varchar("monto", { length: 20 }).notNull(), // Payment amount
  fechaPago: timestamp("fecha_pago").notNull(), // Payment date
  metodoPago: mysqlEnum("metodo_pago", ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"]).default("Transferencia").notNull(),
  notas: text("notas"), // Reference number or notes
  registradoPor: varchar("registrado_por", { length: 255 }), // User name who registered the payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Pago = typeof pagos.$inferSelect;
export type InsertPago = typeof pagos.$inferInsert;

/**
 * Announcements table for configurable toast notifications shown on platform entry
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(), // Announcement title
  mensaje: text("mensaje").notNull(), // Announcement message body
  tipo: mysqlEnum("tipo", ["info", "alerta", "exito", "urgente"]).default("info").notNull(), // Visual type
  activo: int("activo").default(1).notNull(), // 1 = active (shown), 0 = inactive
  fechaInicio: timestamp("fecha_inicio"), // Optional: show from this date
  fechaFin: timestamp("fecha_fin"), // Optional: stop showing after this date
  creadoPor: varchar("creado_por", { length: 255 }), // Admin who created it
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

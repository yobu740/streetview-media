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
  tags: text("tags"), // JSON array of strategic location tags e.g. ["Hospitales","Supermercados"]
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
  tipo: mysqlEnum("tipo", ["Fijo", "Bonificación", "Holder"]).notNull(), // F/B/H from Excel
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
  anuncioIdsJson: text("anuncio_ids_json"), // JSON array of anuncio IDs for regeneration
  createdBy: int("created_by"), // FK to users - who created the invoice (nullable)
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

/**
 * Instalaciones table - tracks ads pending installation in the field
 * Created when: admin creates anuncio with estado=Programado, or when anuncio is relocated
 */
export const instalaciones = mysqlTable("instalaciones", {
  id: int("id").autoincrement().primaryKey(),
  anuncioId: int("anuncio_id").notNull(), // FK to anuncios
  paradaId: int("parada_id").notNull(), // FK to paradas (destination parada)
  fromParadaId: int("from_parada_id"), // FK to paradas (origin parada, only set for Relocalizacion)
  estado: mysqlEnum("estado", ["Programado", "Relocalizacion", "CambioArte", "Instalado"]).default("Programado").notNull(),
  fotoInstalacion: text("foto_instalacion"), // S3 URL of the installed photo (uploaded after installation)
  instaladoAt: timestamp("instalado_at"), // When it was marked as Instalado
  instaladoPor: varchar("instalado_por", { length: 255 }), // User name who marked as installed
  notas: text("notas"), // Optional installation notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Instalacion = typeof instalaciones.$inferSelect;
export type InsertInstalacion = typeof instalaciones.$inferInsert;

/**
 * Clientes (clients/agencies) table
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(), // Agency / client company name
  esAgencia: int("es_agencia").default(0).notNull(), // 1 = advertising agency, 0 = direct client
  direccion: text("direccion"), // Physical address
  ciudad: varchar("ciudad", { length: 100 }), // City
  estado: varchar("estado", { length: 100 }), // State / Province
  codigoPostal: varchar("codigo_postal", { length: 20 }), // ZIP code
  email: varchar("email", { length: 320 }), // Billing email
  telefono: varchar("telefono", { length: 30 }), // Phone number
  contactoPrincipal: varchar("contacto_principal", { length: 255 }), // Main contact person name
  notas: text("notas"), // Internal notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Contratos (contracts) table
 * Each contract belongs to a client and has one or more line items
 */
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("cliente_id").notNull(), // FK to clientes
  numeroContrato: varchar("numero_contrato", { length: 64 }).notNull(), // e.g. 2026-2
  numeroPO: varchar("numero_po", { length: 64 }), // Purchase Order number (for agencies)
  fecha: timestamp("fecha").notNull(), // Contract date
  customerId: varchar("customer_id", { length: 255 }), // Brand name (e.g. "Taco Bell", "CLARO")
  salesDuration: varchar("sales_duration", { length: 255 }), // e.g. "February 2026 - November 2026"
  vendedor: varchar("vendedor", { length: 255 }), // Salesperson name(s)
  metodoPago: varchar("metodo_pago", { length: 100 }).default("ACH / Wire Transfer"), // Payment method
  fechaVencimiento: timestamp("fecha_vencimiento"), // Due date
  subtotal: varchar("subtotal", { length: 20 }), // Subtotal
  total: varchar("total", { length: 20 }), // Total
  notas: text("notas"), // Internal notes
  pdfUrl: text("pdf_url"), // S3 URL to generated PDF
  poDocumentUrl: text("po_document_url"), // S3 URL to uploaded PO document
  numMeses: int("num_meses").default(1), // Number of months (multiplier for line items except production)
  estado: mysqlEnum("estado", ["Borrador", "Enviado", "Firmado", "Cancelado"]).default("Borrador").notNull(),
  docusealSubmissionId: int("docuseal_submission_id"), // DocuSeal submission ID for e-signature
  docusealSigningUrl: text("docuseal_signing_url"), // Direct signing URL for the submitter
  firmaUrl: text("firma_url"), // S3 URL to signed PDF from DocuSeal
  cotizacionId: int("cotizacion_id"), // FK to cotizaciones - if created from a proposal
  createdBy: int("created_by"), // FK to users
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

/**
 * Contrato line items table
 */
export const contratoItems = mysqlTable("contrato_items", {
  id: int("id").autoincrement().primaryKey(),
  contratoId: int("contrato_id").notNull(), // FK to contratos
  cantidad: int("cantidad").notNull().default(1), // QNTY
  concepto: varchar("concepto", { length: 255 }).notNull(), // CONCEPT
  precioPorUnidad: varchar("precio_por_unidad", { length: 20 }), // PRICE PER UNIT
  total: varchar("total", { length: 20 }), // TOTAL (can be "NO CHARGE")
  isProduccion: int("is_produccion").default(0).notNull(), // 1 = production cost (not multiplied by months)
  orden: int("orden").default(0).notNull(), // Display order
});

export type ContratoItem = typeof contratoItems.$inferSelect;
export type InsertContratoItem = typeof contratoItems.$inferInsert;

/**
 * Exhibit A location rows for a contrato
 */
export const contratoExhibitA = mysqlTable("contrato_exhibit_a", {
  id: int("id").autoincrement().primaryKey(),
  contratoId: int("contrato_id").notNull(),
  localizacion: varchar("localizacion", { length: 255 }).notNull().default(""),
  cobertizo: varchar("cobertizo", { length: 64 }).notNull().default(""),
  direccion: varchar("direccion", { length: 512 }).notNull().default(""),
  iop: varchar("iop", { length: 10 }).default(""),
  producto: varchar("producto", { length: 255 }).default(""),
  fb: varchar("fb", { length: 10 }).default(""),
  orden: int("orden").default(0).notNull(),
});
export type ContratoExhibitA = typeof contratoExhibitA.$inferSelect;
export type InsertContratoExhibitA = typeof contratoExhibitA.$inferInsert;

/**
 * Cotizaciones (generated proposal PDFs) table
 * Tracks every proposal PDF generated by vendors in the Calculadora
 */
export const cotizaciones = mysqlTable("cotizaciones", {
  id: int("id").autoincrement().primaryKey(),
  cotizacionNumber: varchar("cotizacion_number", { length: 64 }).notNull(), // e.g. COT-2025-123456
  empresa: varchar("empresa", { length: 255 }).notNull(),           // Client company name
  contacto: varchar("contacto", { length: 255 }).notNull(),         // Contact person
  email: varchar("email", { length: 320 }),                         // Contact email
  vendedorId: int("vendedor_id").notNull(),                         // User ID of the vendor
  vendedorName: varchar("vendedor_name", { length: 255 }),          // Vendor name at time of generation
  fechaInicio: varchar("fecha_inicio", { length: 32 }),             // Campaign start date
  fechaFin: varchar("fecha_fin", { length: 32 }),                   // Campaign end date
  meses: int("meses"),                                              // Duration in months
  descuento: int("descuento").default(0),                          // Discount percentage
  totalMensual: int("total_mensual").default(0),                   // Monthly total in cents
  totalCampana: int("total_campana").default(0),                   // Campaign total in cents
  paradasCount: int("paradas_count").default(0),                   // Number of stops in proposal
  pdfUrl: text("pdf_url"),                                          // S3 URL of the generated PDF
  paradasData: text("paradas_data"),                                  // JSON array of parada IDs and details for reserva creation
  estado: mysqlEnum("estado", ["Pendiente", "Aprobada", "Rechazada"]).default("Pendiente").notNull(), // Approval status
  adminComment: text("admin_comment"),                               // Admin comment on approval/rejection
  approvedAt: timestamp("approved_at"),                              // When admin approved/rejected
  approvedBy: int("approved_by"),                                    // Admin user ID
  convertedToContratoId: int("converted_to_contrato_id"),              // FK to contratos - if converted to a contract
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Cotizacion = typeof cotizaciones.$inferSelect;
export type InsertCotizacion = typeof cotizaciones.$inferInsert;

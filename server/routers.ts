import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, vendedorProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as paradasDb from "./paradas-db";
import { uploadParadaFoto } from "./upload-foto";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Paradas management router
  paradas: router({
    list: publicProcedure.query(async () => {
      return await paradasDb.getAllParadas();
    }),
    
    search: publicProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(async ({ input }) => {
        return await paradasDb.searchParadas(input.searchTerm);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await paradasDb.getParadaById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        cobertizoId: z.string(),
        localizacion: z.string(),
        direccion: z.string(),
        orientacion: z.string(), // Required for uniqueness with cobertizoId
        flowCat: z.string().optional(),
        ruta: z.string().optional(),
        coordenadasLat: z.string().optional(),
        coordenadasLng: z.string().optional(),
        tipoFormato: z.enum(["Fija", "Digital"]),
        activa: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await paradasDb.createParada(input);
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          cobertizoId: z.string().optional(),
          localizacion: z.string().optional(),
          direccion: z.string().optional(),
          orientacion: z.string(), // Required for uniqueness with cobertizoId
          flowCat: z.string().optional(),
          ruta: z.string().optional(),
          coordenadasLat: z.string().optional(),
          coordenadasLng: z.string().optional(),
          tipoFormato: z.enum(["Fija", "Digital"]).optional(),
          activa: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await paradasDb.updateParada(input.id, input.data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await paradasDb.deleteParada(input.id);
        return { success: true };
      }),
    
    uploadFoto: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        cobertizoId: z.string(),
        fotoBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const fotoUrl = await uploadParadaFoto(input.fotoBase64, input.cobertizoId);
        await paradasDb.updateParada(input.paradaId, { fotoUrl });
        return { fotoUrl };
      }),
    
    updateLocation: adminProcedure
      .input(z.object({
        paradaId: z.number(),
        localizacion: z.string().optional(),
        direccion: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { paradaId, ...updates } = input;
        await paradasDb.updateParada(paradaId, updates);
        return { success: true };
      }),
    
    updateCondicion: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        condicionPintada: z.number().optional(),
        condicionArreglada: z.number().optional(),
        condicionLimpia: z.number().optional(),
        displayPublicidad: z.enum(["Si", "No", "N/A"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { paradaId, ...updates } = input;
        
        // Get current parada state before update
        const { getDb } = await import("./db");
        const { paradas, mantenimientoHistorial } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [currentParada] = await db
          .select()
          .from(paradas)
          .where(eq(paradas.id, paradaId))
          .limit(1);
        
        if (!currentParada) throw new Error("Parada not found");
        
        // Track changes in history
        const historyEntries = [];
        
        if (updates.condicionPintada !== undefined && updates.condicionPintada !== currentParada.condicionPintada) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Pintada",
            valorAnterior: currentParada.condicionPintada ? "Sí" : "No",
            valorNuevo: updates.condicionPintada ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.condicionArreglada !== undefined && updates.condicionArreglada !== currentParada.condicionArreglada) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Arreglada",
            valorAnterior: currentParada.condicionArreglada ? "Sí" : "No",
            valorNuevo: updates.condicionArreglada ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.condicionLimpia !== undefined && updates.condicionLimpia !== currentParada.condicionLimpia) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Limpia",
            valorAnterior: currentParada.condicionLimpia ? "Sí" : "No",
            valorNuevo: updates.condicionLimpia ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.displayPublicidad !== undefined && updates.displayPublicidad !== currentParada.displayPublicidad) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Display Publicidad",
            valorAnterior: currentParada.displayPublicidad,
            valorNuevo: updates.displayPublicidad,
            notas: null,
          });
        }
        
        // Insert history entries
        if (historyEntries.length > 0) {
          await db.insert(mantenimientoHistorial).values(historyEntries);
        }
        
        // Update parada
        await paradasDb.updateParada(paradaId, updates);
        return { success: true };
      }),
    
    disponibles: publicProcedure
      .input(z.object({
        fechaInicio: z.date(),
        fechaFin: z.date(),
      }))
      .query(async ({ input }) => {
        return await paradasDb.getParadasDisponibles(input.fechaInicio, input.fechaFin);
      }),
  }),
  
  // Anuncios management router
  anuncios: router({
    list: protectedProcedure.query(async () => {
      return await paradasDb.getAllAnuncios();
    }),
    
    getByParadaId: publicProcedure
      .input(z.object({ paradaId: z.number() }))
      .query(async ({ input }) => {
        return await paradasDb.getAnunciosByParadaId(input.paradaId);
      }),
    
    active: publicProcedure.query(async () => {
      return await paradasDb.getActiveAnuncios();
    }),
    
    /**
     * Create anuncio/reservation
     * - If created by ADMIN: Auto-approved, appears immediately in dashboard and calendar
     * - If created by USER: Pending approval, appears in admin notifications, requires approval to show in calendar
     */
    create: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        producto: z.string(),
        cliente: z.string(),
        tipo: z.enum(["Fijo", "Bonificación"]),
        costoPorUnidad: z.number().optional(),
        fechaInicio: z.date(),
        fechaFin: z.date(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const isAdmin = ctx.user.role === "admin";
        
        // CRITICAL: Check for overlapping reservations BEFORE creating
        const availability = await paradasDb.checkParadaDisponibilidad(
          input.paradaId,
          input.fechaInicio,
          input.fechaFin
        );
        
        if (!availability.disponible) {
          throw new Error(
            `Esta parada ya está ocupada para las fechas seleccionadas. ` +
            `Próxima fecha disponible: ${availability.proximaFechaDisponible?.toLocaleDateString('es-PR')}`
          );
        }
        
        const id = await paradasDb.createAnuncio({
          ...input,
          costoPorUnidad: input.costoPorUnidad !== undefined ? input.costoPorUnidad.toString() : undefined,
          createdBy: ctx.user.id,
          approvalStatus: isAdmin ? "approved" : "pending",
          approvedBy: isAdmin ? ctx.user.id : undefined,
          approvedAt: isAdmin ? new Date() : undefined,
        });
        
        // Only notify admins if created by non-admin (reservation)
        if (!isAdmin) {
          await paradasDb.notifyAdminsOfNewReservation(id, ctx.user.name || 'Usuario', input.cliente);
        }
        
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        paradaId: z.number().optional(),
        producto: z.string().optional(),
        cliente: z.string().optional(),
        tipo: z.enum(["Fijo", "Bonificación"]).optional(),
        costoPorUnidad: z.number().optional(),
        fechaInicio: z.date().optional(),
        fechaFin: z.date().optional(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, costoPorUnidad, ...data } = input;
        const updateData = {
          ...data,
          ...(costoPorUnidad !== undefined && { costoPorUnidad: costoPorUnidad.toString() }),
        };
        await paradasDb.updateAnuncio(id, updateData);
        return { success: true };
      }),
    
    bulkUpdate: adminProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        updates: z.object({
          tipo: z.enum(["Fijo", "Bonificación"]).optional(),
          fechaFin: z.date().optional(),
          estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
          producto: z.string().optional(),
          cliente: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { anuncioIds, updates } = input;
        
        // Update each anuncio
        for (const id of anuncioIds) {
          await paradasDb.updateAnuncio(id, updates);
        }
        
        return { success: true, count: anuncioIds.length };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await paradasDb.deleteAnuncio(input.id);
        return { success: true };
      }),
    
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Cancel anuncio by setting estado to "Inactivo"
        // This frees up the parada while keeping history
        await paradasDb.updateAnuncio(input.id, { estado: "Inactivo" });
        return { success: true };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Inactivo", "Finalizado"])
      }))
      .mutation(async ({ input }) => {
        await paradasDb.updateAnuncio(input.id, { estado: input.estado });
        return { success: true };
      }),
    
    bulkUpdateDates: adminProcedure
      .input(z.object({
        searchCliente: z.string(),
        operation: z.enum(["extend", "set"]),
        months: z.number().optional(),
        newFechaInicio: z.date().optional(),
        newFechaFin: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await paradasDb.bulkUpdateAnuncioDates(
          input.searchCliente,
          input.operation,
          input.months,
          input.newFechaInicio,
          input.newFechaFin
        );
        return { success: true, count };
      }),
    
    checkDisponibilidad: publicProcedure
      .input(z.object({
        paradaId: z.number(),
        fechaInicio: z.date(),
        fechaFin: z.date(),
      }))
      .query(async ({ input }) => {
        const result = await paradasDb.checkParadaDisponibilidad(
          input.paradaId,
          input.fechaInicio,
          input.fechaFin
        );
        return result;
      }),
    
    myReservations: protectedProcedure.query(async ({ ctx }) => {
      return await paradasDb.getAnunciosByUserId(ctx.user.id);
    }),
  }),

  // Notifications router
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getNotificationsByUserId } = await import("./db");
      return await getNotificationsByUserId(ctx.user.id);
    }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotificationCount } = await import("./db");
      return await getUnreadNotificationCount(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./db");
        await markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    expiringAnuncios: adminProcedure.query(async () => {
      return await paradasDb.checkExpiringAnuncios(7);
    }),
  }),
  
  // Approval workflow router
  approvals: router({
    approve: adminProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        await updateAnuncioApprovalStatus(input.anuncioId, "approved", ctx.user.id);
        
        // Notify the creator
        const anuncio = await getAnuncioById(input.anuncioId);
        if (anuncio && anuncio.createdBy) {
          await createNotification({
            userId: anuncio.createdBy,
            type: "reservation_approved",
            title: "Reserva Aprobada",
            message: `Tu reserva para ${anuncio.cliente} ha sido aprobada por ${ctx.user.name || 'Admin'}.`,
            relatedId: input.anuncioId,
            read: 0,
          });
        }
        
        return { success: true };
      }),
    
    reject: adminProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        await updateAnuncioApprovalStatus(input.anuncioId, "rejected", ctx.user.id);
        
        // Notify the creator
        const anuncio = await getAnuncioById(input.anuncioId);
        if (anuncio && anuncio.createdBy) {
          await createNotification({
            userId: anuncio.createdBy,
            type: "reservation_rejected",
            title: "Reserva Rechazada",
            message: `Tu reserva para ${anuncio.cliente} ha sido rechazada por ${ctx.user.name || 'Admin'}.`,
            relatedId: input.anuncioId,
            read: 0,
          });
        }
        
        return { success: true };
      }),
    
    bulkApprove: adminProcedure
      .input(z.object({ anuncioIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        for (const anuncioId of input.anuncioIds) {
          await updateAnuncioApprovalStatus(anuncioId, "approved", ctx.user.id);
          
          // Notify the creator
          const anuncio = await getAnuncioById(anuncioId);
          if (anuncio && anuncio.createdBy) {
            await createNotification({
              userId: anuncio.createdBy,
              type: "reservation_approved",
              title: "Reserva Aprobada",
              message: `Tu reserva para ${anuncio.cliente} ha sido aprobada por ${ctx.user.name || 'Admin'}.`,
              relatedId: anuncioId,
              read: 0,
            });
          }
        }
        
        return { success: true, count: input.anuncioIds.length };
      }),
    
    bulkReject: adminProcedure
      .input(z.object({ anuncioIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        for (const anuncioId of input.anuncioIds) {
          await updateAnuncioApprovalStatus(anuncioId, "rejected", ctx.user.id);
          
          // Notify the creator
          const anuncio = await getAnuncioById(anuncioId);
          if (anuncio && anuncio.createdBy) {
            await createNotification({
              userId: anuncio.createdBy,
              type: "reservation_rejected",
              title: "Reserva Rechazada",
              message: `Tu reserva para ${anuncio.cliente} ha sido rechazada por ${ctx.user.name || 'Admin'}.`,
              relatedId: anuncioId,
              read: 0,
            });
          }
        }
        
        return { success: true, count: input.anuncioIds.length };
      }),
    
    pending: adminProcedure.query(async () => {
      const { getPendingAnuncios } = await import("./paradas-db");
      return await getPendingAnuncios();
    }),
  }),

  // Activity logging router
  activity: router({
    // Log a new activity
    log: protectedProcedure
      .input(z.object({
        action: z.string(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        details: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { activityLog } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.insert(activityLog).values({
          userId: ctx.user.id,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          details: input.details,
        });
        
        return { success: true };
      }),
    
    // Get recent activities for current user
    recent: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { activityLog } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      const activities = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.userId, ctx.user.id))
        .orderBy(desc(activityLog.createdAt))
        .limit(3);
      
      return activities;
    }),
  }),

  // Mantenimiento history router
  mantenimiento: router({    getHistory: publicProcedure
      .input(z.object({ paradaId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { mantenimientoHistorial } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        const history = await db
          .select()
          .from(mantenimientoHistorial)
          .where(eq(mantenimientoHistorial.paradaId, input.paradaId))
          .orderBy(desc(mantenimientoHistorial.createdAt))
          .limit(50);
        
        return history;
      }),
  }),

  // Facturas (invoice history) router
  facturas: router({
    list: protectedProcedure
      .input(z.object({
        cliente: z.string().optional(),
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(facturas);
        
        if (input?.cliente) {
          query = query.where(eq(facturas.cliente, input.cliente)) as any;
        }
        
        const results = await query.orderBy(desc(facturas.createdAt));
        return results;
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(facturas).where(eq(facturas.id, input.id));
        return { success: true };
      }),
  }),

  // Contact form router
  contact: router({
    sendEmail: publicProcedure
      .input(z.object({
        nombre: z.string(),
        email: z.string().email(),
        telefono: z.string(),
        mensaje: z.string(),
        recaptchaToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Verify reCAPTCHA token
          const { verifyRecaptcha } = await import("./recaptcha-service");
          const isValid = await verifyRecaptcha(input.recaptchaToken);
          
          if (!isValid) {
            throw new Error("Verificación de seguridad fallida. Por favor intente nuevamente.");
          }
          
          // Send email
          const { sendContactEmail } = await import("./email-service");
          await sendContactEmail({
            nombre: input.nombre,
            email: input.email,
            telefono: input.telefono,
            mensaje: input.mensaje,
          });
          
          return { success: true, message: "Mensaje enviado correctamente" };
        } catch (error) {
          console.error("[Contact Form] Error:", error);
          throw new Error(error instanceof Error ? error.message : "Error al enviar el mensaje");
        }
      }),
  }),

  // Invoices router
  invoices: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { facturas } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      const results = await db.select().from(facturas).orderBy(desc(facturas.createdAt));
      return results;
    }),
    
    updatePaymentStatus: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        estadoPago: z.enum(["Pendiente", "Pagada", "Vencida"]),
        fechaPago: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({
            estadoPago: input.estadoPago,
            fechaPago: input.fechaPago ? new Date(input.fechaPago) : null,
          })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),
    
    generate: protectedProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        title: z.string().optional(),
        description: z.string().optional(),
        productionCost: z.number().optional(),
        otherServicesDescription: z.string().optional(),
        otherServicesCost: z.number().optional(),
        salespersonName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          console.log("[Invoice Router] Received request with", input.anuncioIds.length, "anuncios");
          const { generateInvoiceFromAnuncios } = await import("./invoice-generator");
          const pdfUrl = await generateInvoiceFromAnuncios(
            input.anuncioIds, 
            input.title, 
            input.description,
            input.productionCost,
            input.otherServicesDescription,
            input.otherServicesCost,
            input.salespersonName
          );
          console.log("[Invoice Router] Generated PDF:", pdfUrl);
          return { pdfUrl };
        } catch (error) {
          console.error("[Invoice Router] Error generating invoice:", error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

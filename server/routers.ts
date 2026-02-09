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
    
    updateCondicion: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        condicionPintada: z.number().optional(),
        condicionArreglada: z.number().optional(),
        condicionLimpia: z.number().optional(),
        displayPublicidad: z.enum(["Si", "No", "N/A"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { paradaId, ...updates } = input;
        
        // Get current parada state before update
        const { getDb } = await import("./db");
        const { paradas, mantenimientoHistorial } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        
        if (db) {
          const [currentParada] = await db.select().from(paradas).where(eq(paradas.id, paradaId));
          
          // Track changes in history
          const historyEntries = [];
          
          if (updates.condicionPintada !== undefined && currentParada.condicionPintada !== updates.condicionPintada) {
            historyEntries.push({
              paradaId,
              userId: ctx.user.id,
              userName: ctx.user.name || ctx.user.email || "Usuario",
              campoModificado: "pintada",
              valorAnterior: currentParada.condicionPintada ? "S\u00ed" : "No",
              valorNuevo: updates.condicionPintada ? "S\u00ed" : "No",
            });
          }
          
          if (updates.condicionArreglada !== undefined && currentParada.condicionArreglada !== updates.condicionArreglada) {
            historyEntries.push({
              paradaId,
              userId: ctx.user.id,
              userName: ctx.user.name || ctx.user.email || "Usuario",
              campoModificado: "arreglada",
              valorAnterior: currentParada.condicionArreglada ? "S\u00ed" : "No",
              valorNuevo: updates.condicionArreglada ? "S\u00ed" : "No",
            });
          }
          
          if (updates.condicionLimpia !== undefined && currentParada.condicionLimpia !== updates.condicionLimpia) {
            historyEntries.push({
              paradaId,
              userId: ctx.user.id,
              userName: ctx.user.name || ctx.user.email || "Usuario",
              campoModificado: "limpia",
              valorAnterior: currentParada.condicionLimpia ? "S\u00ed" : "No",
              valorNuevo: updates.condicionLimpia ? "S\u00ed" : "No",
            });
          }
          
          if (updates.displayPublicidad && currentParada.displayPublicidad !== updates.displayPublicidad) {
            historyEntries.push({
              paradaId,
              userId: ctx.user.id,
              userName: ctx.user.name || ctx.user.email || "Usuario",
              campoModificado: "display",
              valorAnterior: currentParada.displayPublicidad,
              valorNuevo: updates.displayPublicidad,
            });
          }
          
          // Insert history entries
          if (historyEntries.length > 0) {
            await db.insert(mantenimientoHistorial).values(historyEntries);
          }
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
        fechaInicio: z.date().optional(),
        fechaFin: z.date().optional(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await paradasDb.updateAnuncio(id, data);
        return { success: true };
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

  // Mantenimiento (Maintenance) router
  mantenimiento: router({
    getHistory: protectedProcedure
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
});

export type AppRouter = typeof appRouter;

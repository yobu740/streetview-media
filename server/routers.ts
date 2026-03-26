import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, vendedorProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as paradasDb from "./paradas-db";
import { uploadParadaFoto } from "./upload-foto";
import * as db from "./db";

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

    // Returns all distinct flowcat values (number + localizacion name) for filter dropdown
    getFlowcats: publicProcedure.query(async () => {
      return await paradasDb.getDistinctFlowcats();
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
        ruta: z.string().optional(),
        orientacion: z.string().optional(),
        flowCat: z.string().optional(),
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
        enConstruccion: z.number().optional(),
        fechaDisponibilidad: z.date().nullable().optional(),
        removida: z.number().optional(),
        fechaRetorno: z.date().nullable().optional(),
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
        
        if (updates.enConstruccion !== undefined && updates.enConstruccion !== currentParada.enConstruccion) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "En Construcción",
            valorAnterior: currentParada.enConstruccion ? "Sí" : "No",
            valorNuevo: updates.enConstruccion ? "Sí" : "No",
            notas: updates.fechaDisponibilidad
              ? `Fecha estimada: ${new Date(updates.fechaDisponibilidad).toLocaleDateString('es-PR')}`
              : null,
          });
        }
        
        if (updates.removida !== undefined && updates.removida !== currentParada.removida) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Removida",
            valorAnterior: currentParada.removida ? "Sí" : "No",
            valorNuevo: updates.removida ? "Sí" : "No",
            notas: updates.fechaRetorno
              ? `Fecha estimada de retorno: ${new Date(updates.fechaRetorno).toLocaleDateString('es-PR')}`
              : null,
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
    
    toggleDestacada: protectedProcedure
      .input(z.object({ paradaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden marcar caras destacadas.' });
        const { getDb } = await import('./db');
        const { paradas } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [current] = await db.select({ destacada: paradas.destacada }).from(paradas).where(eq(paradas.id, input.paradaId)).limit(1);
        if (!current) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cara no encontrada.' });
        const newValue = current.destacada ? 0 : 1;
        await db.update(paradas).set({ destacada: newValue }).where(eq(paradas.id, input.paradaId));
        return { success: true, destacada: newValue };
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
        
        // CRITICAL: Check if parada is En Construccion BEFORE creating
        const parada = await paradasDb.getParadaById(input.paradaId);
        
        // CRITICAL: Check if parada has display disabled
        if (parada?.displayPublicidad === 'No') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Esta cara no tiene display habilitado y no está disponible para reservas de anuncios.',
          });
        }
        
        if (parada?.enConstruccion) {
          const fechaDisp = parada.fechaDisponibilidad
            ? new Date(parada.fechaDisponibilidad).toLocaleDateString('es-PR')
            : 'fecha no especificada';
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Esta cara está En Construcción y no está disponible para reservas. Fecha estimada de disponibilidad: ${fechaDisp}.`,
          });
        }
        
        if (parada?.removida) {
          const fechaRet = parada.fechaRetorno
            ? new Date(parada.fechaRetorno).toLocaleDateString('es-PR')
            : 'fecha no especificada';
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Esta cara ha sido Removida y no está disponible para reservas. Fecha estimada de retorno: ${fechaRet}.`,
          });
        }
        
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

        // Auto-create instalacion record when admin creates a Programado anuncio
        if (isAdmin && input.estado === 'Programado') {
          try {
            const { createInstalacion } = await import('./db');
            await createInstalacion({
              anuncioId: id,
              paradaId: input.paradaId,
              estado: 'Programado',
            });
          } catch (e) {
            console.error('[Instalaciones] Failed to create instalacion record:', e);
            // Non-fatal: anuncio was created successfully
          }
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
      .mutation(async ({ input, ctx }) => {
        const { id, costoPorUnidad, ...data } = input;
        const updateData = {
          ...data,
          ...(costoPorUnidad !== undefined && { costoPorUnidad: costoPorUnidad.toString() }),
        };

        // If paradaId is changing, auto-create a Relocalizacion instalacion record
        if (input.paradaId !== undefined) {
          try {
            const { getDb } = await import('./db');
            const { anuncios } = await import('../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            const db = await getDb();
            if (db) {
              const [current] = await db.select({ paradaId: anuncios.paradaId }).from(anuncios).where(eq(anuncios.id, id)).limit(1);
              if (current && current.paradaId !== input.paradaId) {
                const { createInstalacion } = await import('./db');
                await createInstalacion({
                  anuncioId: id,
                  paradaId: input.paradaId,
                  fromParadaId: current.paradaId ?? undefined,
                  estado: 'Relocalizacion',
                  notas: `Relocalizado desde parada #${current.paradaId}`,
                });
              }
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to create relocalizacion record:', e);
          }
        }

        await paradasDb.updateAnuncio(id, updateData, ctx.user.id, ctx.user.name || ctx.user.openId);
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
      .mutation(async ({ input, ctx }) => {
        const { anuncioIds, updates } = input;
        
        // Update each anuncio
        for (const id of anuncioIds) {
          await paradasDb.updateAnuncio(id, updates, ctx.user.id, ctx.user.name || ctx.user.openId);
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
      .mutation(async ({ input, ctx }) => {
        // Cancel anuncio by setting estado to "Inactivo"
        // This frees up the parada while keeping history
        await paradasDb.updateAnuncio(input.id, { estado: "Inactivo" }, ctx.user.id, ctx.user.name || ctx.user.openId);
        return { success: true };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Inactivo", "Finalizado"])
      }))
      .mutation(async ({ input, ctx }) => {
        await paradasDb.updateAnuncio(input.id, { estado: input.estado }, ctx.user.id, ctx.user.name || ctx.user.openId);
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
    
    // History tracking
    getHistory: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .query(async ({ input }) => {
        const { getAnuncioHistory } = await import("./db");
        return await getAnuncioHistory(input.anuncioId);
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
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { markAllNotificationsAsRead } = await import("./db");
        await markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
    
    ignore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { ignoreNotification } = await import("./db");
        await ignoreNotification(input.id);
        return { success: true };
      }),

    // Create a seguimiento from a campaign_ending notification
    createSeguimiento: protectedProcedure
      .input(z.object({
        notificationId: z.number(),
        anuncioId: z.number(),
        cliente: z.string(),
        producto: z.string().optional(),
        fechaVencimiento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb, markNotificationAsRead } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Check if a seguimiento already exists for this anuncio and vendedor
        const { eq, and } = await import("drizzle-orm");
        const existing = await db.select().from(seguimientos)
          .where(and(
            eq(seguimientos.anuncioId, input.anuncioId),
            eq(seguimientos.vendedorId, ctx.user!.id)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          // Already exists — just mark notification as read
          await markNotificationAsRead(input.notificationId);
          return { success: true, id: existing[0].id, alreadyExists: true };
        }
        
        // Fetch the actual fechaFin from the anuncio for accuracy
        const { getAnuncioById } = await import("./paradas-db");
        const anuncio = await getAnuncioById(input.anuncioId);
        const fechaVencimiento = anuncio?.fechaFin ? new Date(anuncio.fechaFin) : new Date(input.fechaVencimiento);
        const clienteFromAnuncio = anuncio?.cliente || input.cliente;
        const productoFromAnuncio = anuncio?.producto || input.producto || null;
        
        const [result] = await db.insert(seguimientos).values({
          anuncioId: input.anuncioId,
          vendedorId: ctx.user!.id,
          cliente: clienteFromAnuncio,
          producto: productoFromAnuncio,
          fechaVencimiento,
          estado: "Pendiente",
        });
        
        // Mark the notification as read after creating seguimiento
        await markNotificationAsRead(input.notificationId);
        
        return { success: true, id: result.insertId, alreadyExists: false };
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
        const { getAnuncioById, getParadaById } = await import("./paradas-db");
        
        // Check if the parada is En Construccion before approving
        const anuncioToApprove = await getAnuncioById(input.anuncioId);
        if (anuncioToApprove?.paradaId) {
          const paradaCheck = await getParadaById(anuncioToApprove.paradaId);
          if (paradaCheck?.enConstruccion) {
            const fechaDisp = paradaCheck.fechaDisponibilidad
              ? new Date(paradaCheck.fechaDisponibilidad).toLocaleDateString('es-PR')
              : 'fecha no especificada';
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `No se puede aprobar: la cara está En Construcción. Fecha estimada de disponibilidad: ${fechaDisp}.`,
            });
          }
          if (paradaCheck?.removida) {
            const fechaRet = paradaCheck.fechaRetorno
              ? new Date(paradaCheck.fechaRetorno).toLocaleDateString('es-PR')
              : 'fecha no especificada';
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `No se puede aprobar: la cara ha sido Removida. Fecha estimada de retorno: ${fechaRet}.`,
            });
          }
        }
        
        await updateAnuncioApprovalStatus(input.anuncioId, "approved", ctx.user.id, ctx.user.name || ctx.user.openId);
        
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
        
        // Auto-create instalacion record if anuncio is Programado and no record exists yet
        if (anuncio && anuncio.estado === 'Programado' && anuncio.paradaId) {
          try {
            const { createInstalacion, getInstalacionByAnuncioId } = await import('./db');
            const existing = await getInstalacionByAnuncioId(anuncio.id);
            if (!existing) {
              await createInstalacion({
                anuncioId: anuncio.id,
                paradaId: anuncio.paradaId,
                estado: 'Programado',
              });
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to create instalacion on approval:', e);
          }
        }
        
        return { success: true };
      }),
    
    reject: adminProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        await updateAnuncioApprovalStatus(input.anuncioId, "rejected", ctx.user.id, ctx.user.name || ctx.user.openId);
        
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
          await updateAnuncioApprovalStatus(anuncioId, "approved", ctx.user.id, ctx.user.name || ctx.user.openId);
          
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
          await updateAnuncioApprovalStatus(anuncioId, "rejected", ctx.user.id, ctx.user.name || ctx.user.openId);
          
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
      const { facturas, pagos } = await import("../drizzle/schema");
      const { desc, eq, sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      const results = await db.select().from(facturas).orderBy(desc(facturas.createdAt));
      
      // For each factura, calculate totalPagado from pagos table
      const facturaIds = results.map(f => f.id);
      let pagosSums: Record<number, number> = {};
      if (facturaIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const pagosList = await db
          .select({ facturaId: pagos.facturaId, monto: pagos.monto })
          .from(pagos)
          .where(inArray(pagos.facturaId, facturaIds));
        for (const p of pagosList) {
          pagosSums[p.facturaId] = (pagosSums[p.facturaId] || 0) + parseFloat(p.monto);
        }
      }
      
      return results.map(f => {
        const total = parseFloat(f.total || "0");
        const totalPagado = pagosSums[f.id] || 0;
        const balance = Math.max(0, total - totalPagado);
        return { ...f, totalPagado, balance };
      });
    }),
    
    generateReport: adminProcedure
      .input(z.object({
        facturaIds: z.array(z.number()).optional(), // if provided, only include these
        filtroDescripcion: z.string().optional(),
        titulo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { getDb } = await import("./db");
          const { facturas, pagos } = await import("../drizzle/schema");
          const { desc, inArray } = await import("drizzle-orm");
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          let query = db.select().from(facturas).$dynamic();
          if (input.facturaIds && input.facturaIds.length > 0) {
            query = query.where(inArray(facturas.id, input.facturaIds));
          }
          const facturaList = await query.orderBy(desc(facturas.createdAt));
          
          // Calculate balance for each factura (total - sum of pagos)
          const facturaIds = facturaList.map(f => f.id);
          let pagosSums: Record<number, number> = {};
          if (facturaIds.length > 0) {
            const pagosList = await db
              .select({ facturaId: pagos.facturaId, monto: pagos.monto })
              .from(pagos)
              .where(inArray(pagos.facturaId, facturaIds));
            for (const p of pagosList) {
              pagosSums[p.facturaId] = (pagosSums[p.facturaId] || 0) + parseFloat(p.monto);
            }
          }
          
          const facturaListWithBalance = facturaList.map(f => {
            const total = parseFloat(f.total || "0");
            const totalPagado = pagosSums[f.id] || 0;
            const balance = Math.max(0, total - totalPagado);
            return { ...f, balance };
          });
          
          const { generateFacturacionReportPDF } = await import("./facturacion-report-generator");
          const pdfUrl = await generateFacturacionReportPDF({
            facturas: facturaListWithBalance,
            titulo: input.titulo || "Reporte de Facturación",
            filtroDescripcion: input.filtroDescripcion,
          });
          
          return { pdfUrl };
        } catch (error) {
          console.error("[Invoice Report] Error generating report:", error);
          throw error;
        }
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
        clienteNombre: z.string().optional(),
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
            input.salespersonName,
            input.clienteNombre
          );
          console.log("[Invoice Router] Generated PDF:", pdfUrl);
          return { pdfUrl };
        } catch (error) {
          console.error("[Invoice Router] Error generating invoice:", error);
          throw error;
        }
      }),
    
    // Check for overdue invoices and create notifications
    checkOverdueInvoices: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, users } = await import("../drizzle/schema");
      const { and, eq, lt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all overdue invoices (Pendiente status and past due date)
      const today = new Date();
      const overdueInvoices = await db.select().from(facturas)
        .where(
          and(
            eq(facturas.estadoPago, "Pendiente"),
            lt(facturas.createdAt, new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) // 30 days old
          )
        );
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications for each overdue invoice
      let notificationCount = 0;
      for (const invoice of overdueInvoices) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "invoice_overdue",
            title: "Factura Vencida",
            message: `La factura ${invoice.numeroFactura} para ${invoice.cliente} está vencida (${Math.floor((today.getTime() - new Date(invoice.createdAt).getTime()) / (24 * 60 * 60 * 1000))} días sin pago).`,
            relatedId: invoice.id,
            read: 0,
          });
          notificationCount++;
        }
      }
      
      return { success: true, overdueCount: overdueInvoices.length, notificationCount };
    }),
    
    // Check for clients without invoices in last 30 days
    checkClientsWithoutInvoices: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, anuncios, users } = await import("../drizzle/schema");
      const { eq, and, gte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all active/programado anuncios
      const activeAnuncios = await db.select().from(anuncios)
        .where(
          and(
            eq(anuncios.approvalStatus, "approved"),
            eq(anuncios.estado, "Activo")
          )
        );
      
      // Get unique clients from active anuncios
      const activeClients = Array.from(new Set(activeAnuncios.map(a => a.cliente)));
      
      // Check which clients have no invoice in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const clientsWithoutInvoice: string[] = [];
      
      for (const cliente of activeClients) {
        const recentInvoices = await db.select().from(facturas)
          .where(
            and(
              eq(facturas.cliente, cliente),
              gte(facturas.createdAt, thirtyDaysAgo)
            )
          );
        
        if (recentInvoices.length === 0) {
          clientsWithoutInvoice.push(cliente);
        }
      }
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications
      let notificationCount = 0;
      for (const cliente of clientsWithoutInvoice) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "client_no_invoice",
            title: "Cliente Sin Factura",
            message: `El cliente ${cliente} tiene anuncios activos pero no se ha generado factura en los últimos 30 días.`,
            relatedId: null,
            read: 0,
          });
          notificationCount++;
        }
      }
      
      return { success: true, clientCount: clientsWithoutInvoice.length, notificationCount };
    }),
    
    // Combined check for both overdue invoices and clients without invoices
    checkAndNotify: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, anuncios, users } = await import("../drizzle/schema");
      const { and, eq, lt, gte, lte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const today = new Date();
      let totalNotifications = 0;
      
      // Check overdue invoices
      const overdueInvoices = await db.select().from(facturas)
        .where(
          and(
            eq(facturas.estadoPago, "Pendiente"),
            lt(facturas.createdAt, new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))
          )
        );
      
      // Check clients without invoices
      const activeAnuncios = await db.select().from(anuncios)
        .where(
          and(
            eq(anuncios.approvalStatus, "approved"),
            eq(anuncios.estado, "Activo")
          )
        );
      
      const activeClients = Array.from(new Set(activeAnuncios.map(a => a.cliente)));
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const clientsWithoutInvoice: string[] = [];
      
      for (const cliente of activeClients) {
        const recentInvoices = await db.select().from(facturas)
          .where(
            and(
              eq(facturas.cliente, cliente),
              gte(facturas.createdAt, thirtyDaysAgo)
            )
          );
        
        if (recentInvoices.length === 0) {
          clientsWithoutInvoice.push(cliente);
        }
      }
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications for overdue invoices
      for (const invoice of overdueInvoices) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "invoice_overdue",
            title: "Factura Vencida",
            message: `La factura ${invoice.numeroFactura} para ${invoice.cliente} está vencida (${Math.floor((today.getTime() - new Date(invoice.createdAt).getTime()) / (24 * 60 * 60 * 1000))} días sin pago).`,
            relatedId: invoice.id,
            read: 0,
          });
          totalNotifications++;
        }
      }
      
      // Create notifications for clients without invoices
      for (const cliente of clientsWithoutInvoice) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "client_no_invoice",
            title: "Cliente Sin Factura",
            message: `El cliente ${cliente} tiene anuncios activos pero no se ha generado factura en los últimos 30 días.`,
            relatedId: null,
            read: 0,
          });
          totalNotifications++;
        }
      }
      
      // Check for campaigns ending soon (21, 14, 7 days)
      const intervals = [
        { days: 21, type: "campaign_ending_21d" as const, label: "21 días" },
        { days: 14, type: "campaign_ending_14d" as const, label: "14 días" },
        { days: 7, type: "campaign_ending_7d" as const, label: "7 días" },
      ];
      
      let campaignsEndingSoonCount = 0;
      
      for (const interval of intervals) {
        const targetDate = new Date(today.getTime() + interval.days * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        const endingCampaigns = await db.select().from(anuncios)
          .where(
            and(
              eq(anuncios.approvalStatus, "approved"),
              eq(anuncios.estado, "Activo"),
              gte(anuncios.fechaFin, startOfDay),
              lte(anuncios.fechaFin, endOfDay)
            )
          );
        
        for (const campaign of endingCampaigns) {
          campaignsEndingSoonCount++;
          
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: interval.type,
              title: "Campaña por Vencer",
              message: `La campaña de ${campaign.cliente} (${campaign.producto}) termina en ${interval.label}. Contactar para renovación.`,
              relatedId: campaign.id,
              read: 0,
            });
            totalNotifications++;
          }
        }
      }
      
      return { 
        success: true, 
        overdueCount: overdueInvoices.length, 
        clientsWithoutInvoiceCount: clientsWithoutInvoice.length,
        campaignsEndingSoonCount,
        totalNotifications 
      };
    }),
    
    // Check for campaigns ending soon (21, 14, 7 days before)
    checkCampaignsEndingSoon: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { anuncios, users } = await import("../drizzle/schema");
      const { and, eq, gte, lte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const today = new Date();
      const intervals = [
        { days: 21, type: "campaign_ending_21d" as const, label: "21 días" },
        { days: 14, type: "campaign_ending_14d" as const, label: "14 días" },
        { days: 7, type: "campaign_ending_7d" as const, label: "7 días" },
      ];
      
      let totalNotifications = 0;
      const campaignsEndingSoon: any[] = [];
      
      // Get all admin and vendedor users
      const recipients = await db.select().from(users).where(
        eq(users.role, "admin")
      );
      
      // Check for each interval
      for (const interval of intervals) {
        const targetDate = new Date(today.getTime() + interval.days * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        // Find active campaigns ending on this date
        const endingCampaigns = await db.select().from(anuncios)
          .where(
            and(
              eq(anuncios.approvalStatus, "approved"),
              eq(anuncios.estado, "Activo"),
              gte(anuncios.fechaFin, startOfDay),
              lte(anuncios.fechaFin, endOfDay)
            )
          );
        
        // Create notifications for each campaign
        for (const campaign of endingCampaigns) {
          campaignsEndingSoon.push({ ...campaign, daysRemaining: interval.days });
          
          for (const recipient of recipients) {
            await createNotification({
              userId: recipient.id,
              type: interval.type,
              title: "Campaña por Vencer",
              message: `La campaña de ${campaign.cliente} (${campaign.producto}) termina en ${interval.label}. Contactar para renovación.`,
              relatedId: campaign.id,
              read: 0,
            });
            totalNotifications++;
          }
        }
      }
      
      return { 
        success: true, 
        campaignsCount: campaignsEndingSoon.length,
        totalNotifications,
        campaigns: campaignsEndingSoon
      };
    }),
    
    // Archive invoice
    archive: adminProcedure
      .input(z.object({ facturaId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({ archivada: 1 })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),
    
    // Unarchive invoice
    unarchive: adminProcedure
      .input(z.object({ facturaId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({ archivada: 0 })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),

    // List all pagos (abonos) for a specific factura
    listPagos: protectedProcedure
      .input(z.object({ facturaId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { pagos } = await import("../drizzle/schema");
        const { eq, asc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(pagos)
          .where(eq(pagos.facturaId, input.facturaId))
          .orderBy(asc(pagos.fechaPago));
      }),

    // Register a new abono (partial payment)
    registrarAbono: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        monto: z.number().positive(),
        fechaPago: z.string(), // ISO date string
        metodoPago: z.enum(["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"]),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { pagos, facturas } = await import("../drizzle/schema");
        const { eq, sum } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get the factura to check total
        const [factura] = await db.select().from(facturas).where(eq(facturas.id, input.facturaId));
        if (!factura) throw new TRPCError({ code: "NOT_FOUND", message: "Factura no encontrada" });

        // Insert the new pago
        await db.insert(pagos).values({
          facturaId: input.facturaId,
          monto: input.monto.toFixed(2),
          fechaPago: new Date(input.fechaPago),
          metodoPago: input.metodoPago,
          notas: input.notas || null,
          registradoPor: ctx.user?.name || "Admin",
        });

        // Recalculate total paid and update factura status
        const pagosList = await db.select().from(pagos).where(eq(pagos.facturaId, input.facturaId));
        const totalPagado = pagosList.reduce((acc, p) => acc + parseFloat(p.monto), 0);
        const totalFactura = parseFloat(factura.total);
        const balance = totalFactura - totalPagado;

        let nuevoEstado: "Pendiente" | "Pagada" | "Vencida" | "Pago Parcial";
        if (balance <= 0) {
          nuevoEstado = "Pagada";
        } else if (totalPagado > 0) {
          nuevoEstado = "Pago Parcial";
        } else {
          nuevoEstado = factura.estadoPago === "Vencida" ? "Vencida" : "Pendiente";
        }

        await db.update(facturas)
          .set({
            estadoPago: nuevoEstado,
            fechaPago: nuevoEstado === "Pagada" ? new Date(input.fechaPago) : factura.fechaPago,
          })
          .where(eq(facturas.id, input.facturaId));

        return { success: true, nuevoEstado, totalPagado, balance: Math.max(0, balance) };
      }),

    // Delete an abono
    deleteAbono: adminProcedure
      .input(z.object({ pagoId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { pagos, facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get the pago to find its facturaId before deleting
        const [pago] = await db.select().from(pagos).where(eq(pagos.id, input.pagoId));
        if (!pago) throw new TRPCError({ code: "NOT_FOUND", message: "Abono no encontrado" });

        await db.delete(pagos).where(eq(pagos.id, input.pagoId));

        // Recalculate balance after deletion
        const [factura] = await db.select().from(facturas).where(eq(facturas.id, pago.facturaId));
        if (!factura) return { success: true };

        const pagosList = await db.select().from(pagos).where(eq(pagos.facturaId, pago.facturaId));
        const totalPagado = pagosList.reduce((acc, p) => acc + parseFloat(p.monto), 0);
        const totalFactura = parseFloat(factura.total);
        const balance = totalFactura - totalPagado;

        let nuevoEstado: "Pendiente" | "Pagada" | "Vencida" | "Pago Parcial";
        if (balance <= 0) {
          nuevoEstado = "Pagada";
        } else if (totalPagado > 0) {
          nuevoEstado = "Pago Parcial";
        } else {
          nuevoEstado = factura.estadoPago === "Vencida" ? "Vencida" : "Pendiente";
        }

        await db.update(facturas)
          .set({ estadoPago: nuevoEstado })
          .where(eq(facturas.id, pago.facturaId));

        return { success: true, nuevoEstado, balance: Math.max(0, balance) };
      }),
  }),
  
  // CRM System for Vendedores
  seguimientos: router({
    // Get all follow-ups for current user (vendedor)
    myFollowUps: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(seguimientos)
        .where(eq(seguimientos.vendedorId, ctx.user!.id))
        .orderBy(desc(seguimientos.fechaVencimiento));
    }),
    
    // Get pending follow-ups (campaigns ending soon without contact)
    pending: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { and, eq, or } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(seguimientos)
        .where(
          and(
            eq(seguimientos.vendedorId, ctx.user!.id),
            or(
              eq(seguimientos.estado, "Pendiente"),
              eq(seguimientos.estado, "Contactado")
            )
          )
        );
    }),
    
    // Create new follow-up
    create: protectedProcedure
      .input(z.object({
        anuncioId: z.number(),
        cliente: z.string(),
        producto: z.string().optional(),
        fechaVencimiento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(seguimientos).values({
          anuncioId: input.anuncioId,
          vendedorId: ctx.user!.id,
          cliente: input.cliente,
          producto: input.producto || null,
          fechaVencimiento: new Date(input.fechaVencimiento),
          estado: "Pendiente",
        });
        
        return { success: true, id: result.insertId };
      }),
    
    // Update follow-up status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["Pendiente", "Contactado", "Interesado", "Renovado", "No Renovará"]),
        fechaContacto: z.string().optional(),
        resultado: z.string().optional(),
        proximoSeguimiento: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(seguimientos)
          .set({
            estado: input.estado,
            fechaContacto: input.fechaContacto ? new Date(input.fechaContacto) : undefined,
            resultado: input.resultado || undefined,
            proximoSeguimiento: input.proximoSeguimiento ? new Date(input.proximoSeguimiento) : undefined,
          })
          .where(eq(seguimientos.id, input.id));
        
        return { success: true };
      }),
    
    // Get notes for a follow-up
    getNotes: protectedProcedure
      .input(z.object({ seguimientoId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { notasCliente } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        return await db.select().from(notasCliente)
          .where(eq(notasCliente.seguimientoId, input.seguimientoId))
          .orderBy(desc(notasCliente.createdAt));
      }),
    
    // Add note to follow-up
    addNote: protectedProcedure
      .input(z.object({
        seguimientoId: z.number(),
        nota: z.string(),
        tipoContacto: z.enum(["Llamada", "Email", "Reunión", "WhatsApp", "Otro"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { notasCliente } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(notasCliente).values({
          seguimientoId: input.seguimientoId,
          vendedorId: ctx.user!.id,
          vendedorNombre: ctx.user!.name || "Usuario",
          nota: input.nota,
          tipoContacto: input.tipoContacto,
        });
        
        return { success: true, id: result.insertId };
      }),

    // Create a seguimiento manually (without an anuncio)
    createManual: protectedProcedure
      .input(z.object({
        cliente: z.string().min(1),
        producto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        vendedorId: z.number().optional(), // if admin assigns to a specific vendedor
        fechaVencimiento: z.string().optional(), // defaults to 30 days from now
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const assignedVendedorId = input.vendedorId ?? ctx.user!.id;
        const fechaVenc = input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        const [result] = await db.insert(seguimientos).values({
          anuncioId: null,
          vendedorId: assignedVendedorId,
          cliente: input.cliente,
          producto: input.producto || null,
          telefono: input.telefono || null,
          email: input.email || null,
          fechaVencimiento: fechaVenc,
          estado: "Pendiente",
        });

        return { success: true, id: result.insertId };
      }),

    // Update contact info (phone and email) on a seguimiento
    updateContact: protectedProcedure
      .input(z.object({
        id: z.number(),
        telefono: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({
            telefono: input.telefono ?? null,
            email: input.email ?? null,
          })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Assign a seguimiento to a different vendedor
    assignVendor: protectedProcedure
      .input(z.object({
        id: z.number(),
        vendedorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({ vendedorId: input.vendedorId })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Delete a seguimiento permanently
    deleteSeguimiento: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos, notasCliente } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Delete notes first (FK constraint)
        await db.delete(notasCliente).where(eq(notasCliente.seguimientoId, input.id));
        await db.delete(seguimientos).where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Archive a seguimiento (soft delete)
    archiveSeguimiento: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({ archivedAt: new Date() })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Get archived seguimientos
    archived: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { isNotNull, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(seguimientos)
        .where(isNotNull(seguimientos.archivedAt))
        .orderBy(seguimientos.archivedAt);
    }),

    // List all vendors (users with role vendedor or admin) for assignment dropdown
    listVendors: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const { or, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      }).from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "vendedor")));
    }),

    // Get all active seguimientos (for admin view)
    listAll: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { isNull, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(seguimientos)
        .where(isNull(seguimientos.archivedAt))
        .orderBy(desc(seguimientos.createdAt));
    }),
  }),

  // Announcements (toast notifications) router
  announcements: router({
    // Public: get active announcement to show on platform entry
    getActive: publicProcedure.query(async () => {
      const { getDb } = await import('./db');
      const { announcements } = await import('../drizzle/schema');
      const { and, eq, or, isNull, lte, gte } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return null;
      const now = new Date();
      const [announcement] = await db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.activo, 1),
            or(isNull(announcements.fechaInicio), lte(announcements.fechaInicio, now)),
            or(isNull(announcements.fechaFin), gte(announcements.fechaFin, now))
          )
        )
        .orderBy(announcements.createdAt)
        .limit(1);
      return announcement || null;
    }),

    // Admin: list all announcements
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getDb } = await import('./db');
      const { announcements } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    }),

    // Admin: create announcement
    create: protectedProcedure
      .input(z.object({
        titulo: z.string().min(1),
        mensaje: z.string().min(1),
        tipo: z.enum(['info', 'alerta', 'exito', 'urgente']).default('info'),
        activo: z.number().default(1),
        fechaInicio: z.date().nullable().optional(),
        fechaFin: z.date().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [result] = await db.insert(announcements).values({
          titulo: input.titulo,
          mensaje: input.mensaje,
          tipo: input.tipo,
          activo: input.activo,
          fechaInicio: input.fechaInicio || null,
          fechaFin: input.fechaFin || null,
          creadoPor: ctx.user.name || 'Admin',
        });
        return { success: true, id: result.insertId };
      }),

    // Admin: update announcement
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        mensaje: z.string().min(1).optional(),
        tipo: z.enum(['info', 'alerta', 'exito', 'urgente']).optional(),
        activo: z.number().optional(),
        fechaInicio: z.date().nullable().optional(),
        fechaFin: z.date().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { id, ...updates } = input;
        await db.update(announcements).set(updates).where(eq(announcements.id, id));
        return { success: true };
      }),

    // Admin: delete announcement
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.delete(announcements).where(eq(announcements.id, input.id));
        return { success: true };
      }),

     // Admin: toggle active status
    toggleActive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [current] = await db.select({ activo: announcements.activo }).from(announcements).where(eq(announcements.id, input.id)).limit(1);
        if (!current) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.update(announcements).set({ activo: current.activo ? 0 : 1 }).where(eq(announcements.id, input.id));
        return { success: true, activo: current.activo ? 0 : 1 };
      }),
  }),

  // ─── Instalaciones ────────────────────────────────────────────────────────
  instalaciones: router({
    // List all pending/relocalizacion instalaciones (ordered by flowcat)
    list: protectedProcedure.query(async () => {
      const { getInstalaciones } = await import('./db');
      return await getInstalaciones();
    }),

    // Mark an instalacion as Instalado (also sets anuncio → Activo)
    markInstalado: protectedProcedure
      .input(z.object({
        instalacionId: z.number(),
        fotoInstalacion: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { markInstalacionInstalada } = await import('./db');
        let fotoUrl: string | undefined = undefined;

        // If a data URL is provided, upload it to S3
        if (input.fotoInstalacion && input.fotoInstalacion.startsWith('data:')) {
          try {
            const { storagePut } = await import('./storage');
            const match = input.fotoInstalacion.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mimeType = match[1];
              const base64Data = match[2];
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = mimeType === 'image/png' ? 'png' : 'jpg';
              const key = `instalaciones/foto-${input.instalacionId}-${Date.now()}.${ext}`;
              const { url } = await storagePut(key, buffer, mimeType);
              fotoUrl = url;
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to upload foto:', e);
          }
        }

        const anuncioId = await markInstalacionInstalada(
          input.instalacionId,
          ctx.user.name ?? ctx.user.email ?? 'Unknown',
          fotoUrl
        );
        return { success: true, anuncioId };
      }),

    // Upload installation photo
    uploadFoto: protectedProcedure
      .input(z.object({
        instalacionId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { updateInstalacionFoto } = await import('./db');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `instalaciones/foto-${input.instalacionId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateInstalacionFoto(input.instalacionId, url);
        return { url };
      }),

    // Backfill: create instalacion records for existing Programado anuncios that don't have one
    backfill: adminProcedure.mutation(async () => {
      const { backfillInstalaciones } = await import('./db');
      return await backfillInstalaciones();
    }),

    // ONE-TIME: sync existing installation photos to parada fotoUrl (remove after use)
    syncFotosToParadas: adminProcedure.mutation(async () => {
      const { syncInstalacionFotosToParadas } = await import('./db');
      return await syncInstalacionFotosToParadas();
    }),

    // Get historial: completed installations (estado = Instalado)
    historial: protectedProcedure.query(async () => {
      const { getInstalacionesHistorial } = await import('./db');
      return await getInstalacionesHistorial();
    }),

    // Upload arte to a single anuncio
    uploadArte: protectedProcedure
      .input(z.object({
        anuncioId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { getDb } = await import('./db');
        const { anuncios } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `arte/anuncio-${input.anuncioId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.update(anuncios).set({ notas: url }).where(eq(anuncios.id, input.anuncioId));
        return { url };
      }),

    // Bulk upload same arte to multiple anuncios (same client)
    bulkUploadArte: protectedProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { getDb } = await import('./db');
        const { anuncios } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `arte/bulk-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.update(anuncios).set({ notas: url }).where(inArray(anuncios.id, input.anuncioIds));
        return { url, count: input.anuncioIds.length };
      }),

    // Check if an anuncio has a pending (Programado) instalacion record
    // Used by Gestor de Anuncios to warn before changing estado away from Programado
    checkPendingInstalacion: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { instalaciones, paradas } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select({
            id: instalaciones.id,
            estado: instalaciones.estado,
            cobertizoId: paradas.cobertizoId,
            orientacion: paradas.orientacion,
            direccion: paradas.direccion,
            flowCat: paradas.flowCat,
          })
          .from(instalaciones)
          .innerJoin(paradas, eq(instalaciones.paradaId, paradas.id))
          .where(and(
            eq(instalaciones.anuncioId, input.anuncioId),
            eq(instalaciones.estado, 'Programado')
          ))
          .limit(1);
        return result[0] ?? null;
      }),

    // Confirm that an anuncio was installed: marks its pending instalacion as Instalado
    // Called from Gestor de Anuncios when user confirms installation after changing estado
    confirmInstalled: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { instalaciones } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        // Find the pending instalacion
        const [inst] = await db
          .select({ id: instalaciones.id })
          .from(instalaciones)
          .where(and(
            eq(instalaciones.anuncioId, input.anuncioId),
            eq(instalaciones.estado, 'Programado')
          ))
          .limit(1);
        if (!inst) throw new Error('No pending instalacion found');
        // Mark as Instalado using the existing helper
        const { markInstalacionInstalada } = await import('./db');
        await markInstalacionInstalada(
          inst.id,
          ctx.user.name ?? ctx.user.email ?? 'Gestor de Anuncios',
          undefined // no photo
        );
        return { success: true, instalacionId: inst.id };
      }),

    // Cancel (delete) one or more instalacion records and revert anuncio to Disponible
    cancel: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { instalaciones, anuncios } = await import('../drizzle/schema');
        const { eq, inArray } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get anuncio IDs before deleting
        const records = await db
          .select({ id: instalaciones.id, anuncioId: instalaciones.anuncioId })
          .from(instalaciones)
          .where(inArray(instalaciones.id, input.ids));

        const anuncioIds = [...new Set(records.map(r => r.anuncioId))];

        // Delete the instalacion records
        await db.delete(instalaciones).where(inArray(instalaciones.id, input.ids));

        // Revert each anuncio to Disponible (only if it has no other pending instalacion)
        for (const anuncioId of anuncioIds) {
          const remaining = await db
            .select({ id: instalaciones.id })
            .from(instalaciones)
            .where(eq(instalaciones.anuncioId, anuncioId))
            .limit(1);
          if (remaining.length === 0) {
            await db.update(anuncios)
              .set({ estado: 'Disponible' })
              .where(eq(anuncios.id, anuncioId));
          }
        }

        return { success: true, deleted: input.ids.length };
      }),

    // Get all instalaciones including Instalado (for history / order generation)
    listAll: protectedProcedure.query(async () => {
      const { getDb } = await import('./db');
      const { instalaciones, anuncios, paradas } = await import('../drizzle/schema');
      const { eq, asc } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      return await db
        .select({
          id: instalaciones.id,
          anuncioId: instalaciones.anuncioId,
          paradaId: instalaciones.paradaId,
          estado: instalaciones.estado,
          fotoInstalacion: instalaciones.fotoInstalacion,
          instaladoAt: instalaciones.instaladoAt,
          instaladoPor: instalaciones.instaladoPor,
          notas: instalaciones.notas,
          createdAt: instalaciones.createdAt,
          producto: anuncios.producto,
          cliente: anuncios.cliente,
          tipo: anuncios.tipo,
          fechaInicio: anuncios.fechaInicio,
          fechaFin: anuncios.fechaFin,
          estadoAnuncio: anuncios.estado,
          cobertizoId: paradas.cobertizoId,
          orientacion: paradas.orientacion,
          direccion: paradas.direccion,
          localizacion: paradas.localizacion,
          flowCat: paradas.flowCat,
          coordenadasLat: paradas.coordenadasLat,
          coordenadasLng: paradas.coordenadasLng,
        })
        .from(instalaciones)
        .innerJoin(anuncios, eq(instalaciones.anuncioId, anuncios.id))
        .innerJoin(paradas, eq(instalaciones.paradaId, paradas.id))
        .orderBy(asc(paradas.flowCat), asc(paradas.cobertizoId));
    }),
  }),
  // ─── Clientes routerr ─────────────────────────────────────────────────────────
  clientes: router({
    list: adminProcedure.query(async () => {
      return await db.listClientes();
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const cliente = await db.getClienteById(input.id);
        if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        return cliente;
      }),

    create: adminProcedure
      .input(z.object({
        nombre: z.string().min(1),
        esAgencia: z.number().default(0),
        direccion: z.string().optional(),
        ciudad: z.string().optional(),
        estado: z.string().optional(),
        codigoPostal: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        telefono: z.string().optional(),
        contactoPrincipal: z.string().optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCliente({
          nombre: input.nombre,
          esAgencia: input.esAgencia,
          direccion: input.direccion ?? null,
          ciudad: input.ciudad ?? null,
          estado: input.estado ?? null,
          codigoPostal: input.codigoPostal ?? null,
          email: input.email || null,
          telefono: input.telefono ?? null,
          contactoPrincipal: input.contactoPrincipal ?? null,
          notas: input.notas ?? null,
        });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1).optional(),
        esAgencia: z.number().optional(),
        direccion: z.string().optional().nullable(),
        ciudad: z.string().optional().nullable(),
        estado: z.string().optional().nullable(),
        codigoPostal: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        telefono: z.string().optional().nullable(),
        contactoPrincipal: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCliente(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCliente(input.id);
        return { success: true };
      }),
  }),

  // ─── Contratos router ─────────────────────────────────────────────────────────
  contratos: router({
    list: adminProcedure
      .input(z.object({ clienteId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.listContratos(input.clienteId);
      }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const contrato = await db.getContratoById(input.id);
        if (!contrato) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
        const items = await db.getContratoItems(input.id);
        return { ...contrato, items };
      }),

    create: adminProcedure
      .input(z.object({
        clienteId: z.number(),
        numeroContrato: z.string().min(1),
        numeroPO: z.string().optional(),
        fecha: z.date(),
        customerId: z.string().optional(),
        salesDuration: z.string().optional(),
        vendedor: z.string().optional(),
        metodoPago: z.string().optional(),
        fechaVencimiento: z.date().optional(),
        subtotal: z.string().optional(),
        total: z.string().optional(),
        notas: z.string().optional(),
        estado: z.enum(["Borrador", "Enviado", "Firmado", "Cancelado"]).default("Borrador"),
        items: z.array(z.object({
          cantidad: z.number().default(1),
          concepto: z.string().min(1),
          precioPorUnidad: z.string().optional(),
          total: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { items, ...contratoData } = input;
        const id = await db.createContrato(
          { ...contratoData, createdBy: ctx.user.id },
          items.map((item, i) => ({ ...item, contratoId: 0, orden: i, precioPorUnidad: item.precioPorUnidad ?? null, total: item.total ?? null }))
        );
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        clienteId: z.number().optional(),
        numeroContrato: z.string().optional(),
        numeroPO: z.string().optional().nullable(),
        fecha: z.date().optional(),
        customerId: z.string().optional().nullable(),
        salesDuration: z.string().optional().nullable(),
        vendedor: z.string().optional().nullable(),
        metodoPago: z.string().optional().nullable(),
        fechaVencimiento: z.date().optional().nullable(),
        subtotal: z.string().optional().nullable(),
        total: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
        estado: z.enum(["Borrador", "Enviado", "Firmado", "Cancelado"]).optional(),
        pdfUrl: z.string().optional().nullable(),
        items: z.array(z.object({
          cantidad: z.number().default(1),
          concepto: z.string().min(1),
          precioPorUnidad: z.string().optional(),
          total: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, items, ...data } = input;
        await db.updateContrato(id, data);
        if (items !== undefined) {
          await db.updateContratoItems(id, items.map((item, i) => ({ ...item, contratoId: id, orden: i, precioPorUnidad: item.precioPorUnidad ?? null, total: item.total ?? null })));
        }
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContrato(input.id);
        return { success: true };
      }),

    savePdfUrl: adminProcedure
      .input(z.object({ id: z.number(), pdfUrl: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateContratoPdfUrl(input.id, input.pdfUrl);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

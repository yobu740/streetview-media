import { describe, it, expect, afterAll } from 'vitest';
import { checkParadaDisponibilidad, createAnuncio } from './paradas-db';
import { getDb } from './db';

// Track created anuncio IDs so we can clean them up after tests
const createdAnuncioIds: number[] = [];

afterAll(async () => {
  // Clean up all test anuncios created during these tests
  if (createdAnuncioIds.length === 0) return;
  const db = await getDb();
  if (!db) return;
  const { anuncios } = await import('../drizzle/schema');
  const { inArray } = await import('drizzle-orm');
  await db.delete(anuncios).where(inArray(anuncios.id, createdAnuncioIds));
});

describe('Anuncios Availability Validation', () => {
  it('should detect overlapping approved anuncios', async () => {
    // Create a test anuncio for parada 1
    const fechaInicio = new Date('2026-03-01');
    const fechaFin = new Date('2026-03-31');
    
    const anuncioId = await createAnuncio({
      paradaId: 1,
      producto: 'Test Producto',
      cliente: 'Test Cliente',
      tipo: 'Fijo',
      fechaInicio,
      fechaFin,
      estado: 'Activo',
      approvalStatus: 'approved',
      createdBy: 1,
      approvedBy: 1,
      approvedAt: new Date(),
    });
    
    createdAnuncioIds.push(anuncioId);
    expect(anuncioId).toBeGreaterThan(0);
    
    // Check availability for overlapping dates
    const availability = await checkParadaDisponibilidad(
      1,
      new Date('2026-03-15'),
      new Date('2026-04-15')
    );
    
    expect(availability.disponible).toBe(false);
    expect(availability.proximaFechaDisponible).toBeTruthy();
  });
  
  it('should allow booking after existing anuncio ends', async () => {
    // Check availability after the anuncio ends
    const availability = await checkParadaDisponibilidad(
      1,
      new Date('2026-04-01'),
      new Date('2026-04-30')
    );
    
    expect(availability.disponible).toBe(true);
  });
  
  it('should not consider pending reservations in availability', async () => {
    // Create a pending reservation
    const anuncioId = await createAnuncio({
      paradaId: 2,
      producto: 'Pending Producto',
      cliente: 'Pending Test',
      tipo: 'Fijo',
      fechaInicio: new Date('2026-05-01'),
      fechaFin: new Date('2026-05-31'),
      estado: 'Programado',
      approvalStatus: 'pending', // Not approved yet
      createdBy: 2,
    });
    
    createdAnuncioIds.push(anuncioId);
    expect(anuncioId).toBeGreaterThan(0);
    
    // Check availability - should be available since reservation is pending
    const availability = await checkParadaDisponibilidad(
      2,
      new Date('2026-05-01'),
      new Date('2026-05-31')
    );
    
    expect(availability.disponible).toBe(true);
  });
  
  it('should not consider Inactivo anuncios in availability', async () => {
    // Create an inactive anuncio
    const anuncioId = await createAnuncio({
      paradaId: 3,
      producto: 'Cancelled Producto',
      cliente: 'Cancelled Test',
      tipo: 'Fijo',
      fechaInicio: new Date('2026-06-01'),
      fechaFin: new Date('2026-06-30'),
      estado: 'Inactivo', // Cancelled
      approvalStatus: 'approved',
      createdBy: 1,
      approvedBy: 1,
      approvedAt: new Date(),
    });
    
    createdAnuncioIds.push(anuncioId);
    expect(anuncioId).toBeGreaterThan(0);
    
    // Check availability - should be available since anuncio is inactive
    const availability = await checkParadaDisponibilidad(
      3,
      new Date('2026-06-01'),
      new Date('2026-06-30')
    );
    
    expect(availability.disponible).toBe(true);
  });
});

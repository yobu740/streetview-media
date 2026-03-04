import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';

describe('Role-based Access Control', () => {
  it('should allow admin to create parada', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', role: 'admin', name: 'Admin', openId: '123' }
    } as Context);

    const result = await caller.paradas.create({
      cobertizoId: 'TEST-001',
      localizacion: 'Test Location',
      direccion: 'Test Address',
      orientacion: 'I',
      tipoFormato: 'Fija'
    });

    expect(result).toHaveProperty('id');
    expect(typeof result.id).toBe('number');
  });

  it('should prevent vendedor from creating parada', async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, email: 'vendedor@test.com', role: 'vendedor', name: 'Vendedor', openId: '456' }
    } as Context);

    await expect(
      caller.paradas.create({
        cobertizoId: 'TEST-002',
        localizacion: 'Test Location',
        direccion: 'Test Address',
        orientacion: 'I',
        tipoFormato: 'Fija'
      })
    ).rejects.toThrow();
  });

  it('should allow vendedor to create anuncio', async () => {  // Note: this test requires DB access and may be slow
    const caller = appRouter.createCaller({
      user: { id: 2, email: 'vendedor@test.com', role: 'vendedor', name: 'Vendedor', openId: '456' }
    } as Context);

    // First get a parada to use - pick one that is NOT en construccion and has display enabled
    const paradas = await caller.paradas.list();
    if (paradas.length === 0) {
      console.log('No paradas available for test');
      return;
    }
    const testParada = paradas.find(p => !p.enConstruccion && p.displayPublicidad !== 'No') ?? paradas[0];

    const result = await caller.anuncios.create({
      paradaId: testParada.id,
      producto: 'Test Producto',
      cliente: 'Test Client',
      tipo: 'Fijo',
      fechaInicio: new Date('2027-08-01'),
      fechaFin: new Date('2027-08-31'),
      estado: 'Programado'
    });

    expect(result).toHaveProperty('id');
    expect(typeof result.id).toBe('number');
  });

  it('should prevent vendedor from deleting parada', async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, email: 'vendedor@test.com', role: 'vendedor', name: 'Vendedor', openId: '456' }
    } as Context);

    await expect(
      caller.paradas.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it('should allow admin to delete parada', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: 'admin@test.com', role: 'admin', name: 'Admin', openId: '123' }
    } as Context);

    // Create a test parada first
    const created = await caller.paradas.create({
      cobertizoId: 'TEST-DELETE',
      localizacion: 'Test Location',
      direccion: 'Test Address',
      orientacion: 'O',
      tipoFormato: 'Fija'
    });

    const result = await caller.paradas.delete({ id: created.id });
    expect(result).toEqual({ success: true });
  });
});

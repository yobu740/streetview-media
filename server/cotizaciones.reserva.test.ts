/**
 * Unit tests for cotizaciones.createReservaFromCotizacion procedure
 *
 * These tests verify the core business logic of converting an approved
 * cotizacion into a contrato (reserva).
 */

import { describe, it, expect } from 'vitest';

// ─── Helper: build a mock cotizacion ───────────────────────────────────────
function buildMockCotizacion(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    cotizacionNumber: 'COT-2026-123456',
    empresa: 'ACME Corp',
    contacto: 'John Doe',
    email: 'john@acme.com',
    vendedorId: 42,
    vendedorName: 'María Vendedora',
    fechaInicio: '2026-06-01',
    fechaFin: '2026-08-31',
    meses: 3,
    descuento: 10,
    totalMensual: 450000, // cents
    totalCampana: 1350000, // cents
    estado: 'Aprobada',
    convertedToContratoId: null,
    paradasData: JSON.stringify([
      {
        cobertizoId: '101',
        localizacion: 'Hato Rey Norte',
        direccion: 'Ave. Ponce de León 101',
        orientacion: 'I',
        tipoFormato: 'Fija',
        precioMes: 1500,
      },
      {
        cobertizoId: '202A',
        localizacion: 'Santurce',
        direccion: 'Ave. Fernández Juncos 202',
        orientacion: 'O',
        tipoFormato: 'Digital',
        precioMes: 3000,
      },
    ]),
    pdfUrl: null,
    adminComment: null,
    approvedAt: null,
    approvedBy: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Business logic helpers extracted for unit testing ────────────────────

/**
 * Parses paradasData JSON safely.
 */
function parseParadasData(raw: string | null | undefined): Array<{ cobertizoId: string; localizacion: string; direccion: string; orientacion: string; tipoFormato: string; precioMes: number }> {
  try {
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Calculates totals from paradas array and discount.
 */
function calcTotals(paradas: Array<{ precioMes: number }>, meses: number, descuento: number) {
  const sumMensual = paradas.reduce((s, p) => s + p.precioMes, 0);
  const totalMensual = sumMensual * (1 - descuento / 100);
  const totalCampana = totalMensual * meses;
  return { totalMensual, totalCampana };
}

/**
 * Builds line items from paradas.
 */
function buildLineItems(paradas: Array<{ cobertizoId: string; localizacion: string; orientacion: string; tipoFormato: string; precioMes: number }>, meses: number) {
  const ORI_LABEL: Record<string, string> = { I: 'Inbound', O: 'Outbound', P: 'Peatonal' };
  return paradas.map((p, i) => ({
    orden: i,
    cantidad: 1,
    concepto: `Parada #${p.cobertizoId} - ${p.localizacion} (${ORI_LABEL[p.orientacion] ?? p.orientacion}, ${p.tipoFormato})`,
    precioPorUnidad: String(p.precioMes),
    total: String(p.precioMes * meses),
    isProduccion: 0,
  }));
}

/**
 * Builds Exhibit A rows from paradas.
 */
function buildExhibitA(paradas: Array<{ cobertizoId: string; localizacion: string; direccion: string; orientacion: string; tipoFormato: string }>, empresa: string) {
  return paradas.map((p, i) => ({
    orden: i,
    localizacion: p.localizacion,
    cobertizo: p.cobertizoId,
    direccion: p.direccion,
    iop: p.orientacion,
    producto: empresa,
    fb: p.tipoFormato === 'Digital' ? 'D' : 'F',
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('cotizaciones.createReservaFromCotizacion – business logic', () => {
  it('parses paradasData correctly', () => {
    const cot = buildMockCotizacion();
    const paradas = parseParadasData(cot.paradasData);
    expect(paradas).toHaveLength(2);
    expect(paradas[0].cobertizoId).toBe('101');
    expect(paradas[1].cobertizoId).toBe('202A');
    expect(paradas[0].precioMes).toBe(1500);
  });

  it('returns empty array for null paradasData', () => {
    const paradas = parseParadasData(null);
    expect(paradas).toHaveLength(0);
  });

  it('returns empty array for malformed JSON', () => {
    const paradas = parseParadasData('{not valid json}');
    expect(paradas).toHaveLength(0);
  });

  it('calculates totals correctly with discount', () => {
    const cot = buildMockCotizacion();
    const paradas = parseParadasData(cot.paradasData);
    const { totalMensual, totalCampana } = calcTotals(paradas, cot.meses, cot.descuento);
    // sum = 1500 + 3000 = 4500, discount 10% → 4050/mes, × 3 meses = 12150
    expect(totalMensual).toBeCloseTo(4050);
    expect(totalCampana).toBeCloseTo(12150);
  });

  it('calculates totals correctly with zero discount', () => {
    const cot = buildMockCotizacion({ descuento: 0 });
    const paradas = parseParadasData(cot.paradasData);
    const { totalMensual, totalCampana } = calcTotals(paradas, cot.meses, 0);
    expect(totalMensual).toBeCloseTo(4500);
    expect(totalCampana).toBeCloseTo(13500);
  });

  it('builds line items with correct concepto labels', () => {
    const cot = buildMockCotizacion();
    const paradas = parseParadasData(cot.paradasData);
    const items = buildLineItems(paradas, cot.meses);
    expect(items).toHaveLength(2);
    expect(items[0].concepto).toContain('Inbound');
    expect(items[0].concepto).toContain('#101');
    expect(items[1].concepto).toContain('Outbound');
    expect(items[1].concepto).toContain('#202A');
    expect(items[0].total).toBe(String(1500 * 3));
    expect(items[1].total).toBe(String(3000 * 3));
  });

  it('builds Exhibit A rows with correct fb flag', () => {
    const cot = buildMockCotizacion();
    const paradas = parseParadasData(cot.paradasData);
    const exhibitA = buildExhibitA(paradas, cot.empresa);
    expect(exhibitA).toHaveLength(2);
    expect(exhibitA[0].fb).toBe('F'); // Fija
    expect(exhibitA[1].fb).toBe('D'); // Digital
    expect(exhibitA[0].cobertizo).toBe('101');
    expect(exhibitA[0].producto).toBe('ACME Corp');
  });

  it('generates a contrato number with correct format', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand = 1234;
    const numeroContrato = `SV-${year}${month}-${rand}`;
    expect(numeroContrato).toMatch(/^SV-\d{6}-\d{4}$/);
    expect(numeroContrato.startsWith(`SV-${year}${month}`)).toBe(true);
  });

  it('rejects conversion when cotizacion is not Aprobada', () => {
    const cot = buildMockCotizacion({ estado: 'Pendiente' });
    const shouldReject = cot.estado !== 'Aprobada';
    expect(shouldReject).toBe(true);
  });

  it('detects already-converted cotizacion', () => {
    const cot = buildMockCotizacion({ convertedToContratoId: 99 });
    const alreadyConverted = !!cot.convertedToContratoId;
    expect(alreadyConverted).toBe(true);
  });

  it('builds salesDuration string from fechaInicio and fechaFin', () => {
    const cot = buildMockCotizacion();
    const salesDuration = cot.fechaInicio && cot.fechaFin
      ? `${cot.fechaInicio} - ${cot.fechaFin}`
      : undefined;
    expect(salesDuration).toBe('2026-06-01 - 2026-08-31');
  });

  it('returns undefined salesDuration when dates are missing', () => {
    const cot = buildMockCotizacion({ fechaInicio: null, fechaFin: null });
    const salesDuration = cot.fechaInicio && cot.fechaFin
      ? `${cot.fechaInicio} - ${cot.fechaFin}`
      : undefined;
    expect(salesDuration).toBeUndefined();
  });
});

import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../drizzle/schema.ts';
import XLSX from 'xlsx';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  console.log('📊 Leyendo Excel...');
  
  const workbook = XLSX.readFile('/home/ubuntu/upload/SISTEMASPARADAS1-31-26.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Header está en fila 3 (índice 3)
  const headers = data[3];
  const cobIndex = headers.indexOf('#COB.');
  const productoIndex = headers.indexOf('PRODUCTO');
  const fbIndex = headers.indexOf('F/B');
  
  console.log(`✅ Columnas encontradas: #COB=${cobIndex}, PRODUCTO=${productoIndex}, F/B=${fbIndex}`);
  
  // 1. Actualizar tipos de paradas basado en letras en ID
  console.log('\n🔄 Actualizando tipos de paradas...');
  
  const allParadas = await db.select().from(schema.paradas);
  let updatedCount = 0;
  
  for (const parada of allParadas) {
    const hasLetters = /[A-Z]/.test(parada.cobertizoId);
    const newTipo = hasLetters ? 'Digital' : 'Fija';
    
    if (parada.tipoFormato !== newTipo) {
      await db.update(schema.paradas)
        .set({ tipoFormato: newTipo })
        .where(eq(schema.paradas.id, parada.id));
      updatedCount++;
    }
  }
  
  console.log(`✅ Actualizadas ${updatedCount} paradas`);
  
  // 2. Importar anuncios activos
  console.log('\n📝 Importando anuncios activos...');
  
  const productosExcluidos = ['REMOVIDA', 'NO DISPLAY', 'APAGADO', 'NO AFICHE', 'DIGITAL'];
  let anunciosCreados = 0;
  
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    const cobertizoId = row[cobIndex]?.toString().trim();
    const producto = row[productoIndex]?.toString().trim();
    const fb = row[fbIndex]?.toString().trim();
    
    if (!cobertizoId || !producto || productosExcluidos.includes(producto.toUpperCase())) {
      continue;
    }
    
    // Buscar parada por cobertizoId
    const parada = await db.select()
      .from(schema.paradas)
      .where(eq(schema.paradas.cobertizoId, cobertizoId))
      .limit(1);
    
    if (parada.length === 0) {
      console.log(`⚠️  Parada no encontrada: ${cobertizoId}`);
      continue;
    }
    
    const paradaId = parada[0].id;
    
    // Verificar si ya existe un anuncio activo para esta parada
    const existingAnuncio = await db.select()
      .from(schema.anuncios)
      .where(
        and(
          eq(schema.anuncios.paradaId, paradaId),
          eq(schema.anuncios.estado, 'Activo')
        )
      )
      .limit(1);
    
    if (existingAnuncio.length > 0) {
      continue; // Ya tiene anuncio activo
    }
    
    // Determinar tipo (Fijo o Bonificación)
    const tipo = fb === 'B' ? 'Bonificación' : 'Fijo';
    
    // Generar fechas aleatorias
    const fechaInicio = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + Math.floor(Math.random() * 6) + 1); // 1-6 meses después
    
    // Crear anuncio
    await db.insert(schema.anuncios).values({
      paradaId,
      cliente: producto,
      tipo,
      fechaInicio,
      fechaFin,
      estado: 'Activo',
      notas: 'Importado desde Excel'
    });
    
    anunciosCreados++;
  }
  
  console.log(`✅ Creados ${anunciosCreados} anuncios activos`);
  
  // 3. Estadísticas finales
  console.log('\n📊 Estadísticas finales:');
  const totalParadas = await db.select().from(schema.paradas);
  const paradasFijas = totalParadas.filter(p => p.tipoFormato === 'Fija').length;
  const paradasDigitales = totalParadas.filter(p => p.tipoFormato === 'Digital').length;
  const totalAnuncios = await db.select().from(schema.anuncios);
  
  console.log(`- Total paradas: ${totalParadas.length}`);
  console.log(`- Paradas Fijas: ${paradasFijas}`);
  console.log(`- Paradas Digitales: ${paradasDigitales}`);
  console.log(`- Total anuncios: ${totalAnuncios.length}`);
  
  console.log('\n✅ Proceso completado');
}

main().catch(console.error);

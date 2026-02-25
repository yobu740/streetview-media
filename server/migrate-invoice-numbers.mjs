import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { facturas } from '../drizzle/schema.ts';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function migrateInvoiceNumbers() {
  console.log('Starting invoice number migration...');
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Get all invoices ordered by ID (creation order)
    const allInvoices = await db
      .select()
      .from(facturas)
      .orderBy(sql`${facturas.id} ASC`);
    
    console.log(`Found ${allInvoices.length} invoices to migrate`);
    
    if (allInvoices.length === 0) {
      console.log('No invoices to migrate');
      return;
    }
    
    // Renumber starting from 1000
    let newNumber = 1000;
    
    for (const invoice of allInvoices) {
      const newInvoiceNumber = `INV-${newNumber}`;
      
      await db
        .update(facturas)
        .set({ numeroFactura: newInvoiceNumber })
        .where(sql`${facturas.id} = ${invoice.id}`);
      
      console.log(`Updated invoice ID ${invoice.id}: ${invoice.numeroFactura} -> ${newInvoiceNumber}`);
      newNumber++;
    }
    
    console.log(`\nMigration complete! Updated ${allInvoices.length} invoices`);
    console.log(`New numbering range: INV-1000 to INV-${newNumber - 1}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrateInvoiceNumbers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

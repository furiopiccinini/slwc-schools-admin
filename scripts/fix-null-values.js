#!/usr/bin/env node

/**
 * Script per correggere i valori NULL nel database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Correggendo valori NULL nel database...');
  
  try {
    // Aggiorna i record con documentType NULL
    const updatedDocumentType = await prisma.subscriber.updateMany({
      where: {
        documentType: null
      },
      data: {
        documentType: 'CI' // Carta Identità come default
      }
    });
    
    console.log(`✅ Aggiornati ${updatedDocumentType.count} record con documentType NULL`);
    
    // Aggiorna i record con documentNumber NULL
    const updatedDocumentNumber = await prisma.subscriber.updateMany({
      where: {
        documentNumber: null
      },
      data: {
        documentNumber: 'N/A' // Valore di default
      }
    });
    
    console.log(`✅ Aggiornati ${updatedDocumentNumber.count} record con documentNumber NULL`);
    
    console.log('✅ documentExpiry non può essere NULL nel database');
    
    console.log('🎉 Correzione completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

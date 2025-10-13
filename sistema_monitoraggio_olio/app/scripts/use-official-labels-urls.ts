import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function useOfficialLabelsUrls() {
  console.log('🔧 Aggiornamento contenuti di test con URL etichette ufficiali...');

  // Prendi alcune etichette ufficiali dal database
  const etichette = await prisma.etichetteUfficiali.findMany({
    where: { isAttiva: true },
    take: 5,
    select: { id: true, nome: true, imageUrl: true }
  });

  console.log(`📊 Trovate ${etichette.length} etichette ufficiali disponibili`);

  // Prendi i contenuti di test (quelli inseriti recentemente senza verifiche)
  const testContenuti = await prisma.contenutiMonitorati.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 3600000) // Ultima ora
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`📊 Trovati ${testContenuti.length} contenuti di test da aggiornare`);

  let updated = 0;
  
  for (let i = 0; i < Math.min(testContenuti.length, etichette.length); i++) {
    const contenuto = testContenuti[i];
    const etichetta = etichette[i];
    
    try {
      await prisma.contenutiMonitorati.update({
        where: { id: contenuto.id },
        data: { 
          imageUrl: etichetta.imageUrl,
          metadata: {
            imageDetection: {
              source: 'test',
              etichettaUfficialeId: etichetta.id,
              etichettaNome: etichetta.nome,
              detectedAt: new Date().toISOString()
            }
          }
        }
      });
      console.log(`✅ Aggiornato contenuto con immagine etichetta: ${etichetta.nome}`);
      updated++;
    } catch (error) {
      console.error(`❌ Errore aggiornamento:`, error);
    }
  }

  console.log(`\n📊 Riepilogo:`);
  console.log(`   ✅ Aggiornati: ${updated} contenuti`);
  console.log(`\n🎯 Ora puoi:`);
  console.log(`   1. Ricarica la pagina Contenuti Monitorati`);
  console.log(`   2. I contenuti avranno badge 📷 "Contiene Immagine"`);
  console.log(`   3. Clicca "🔍 Verifica Etichetta" per testare il flusso completo!`);
  console.log(`   4. Il sistema dovrebbe riconoscere le etichette ufficiali con score alto ✅`);
}

useOfficialLabelsUrls()
  .then(() => {
    console.log('\n✅ Script completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

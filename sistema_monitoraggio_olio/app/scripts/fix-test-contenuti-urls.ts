import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTestContenutiUrls() {
  console.log('🔧 Aggiornamento URL immagini di test con URL più affidabili...');

  // Recupera i contenuti di test inseriti precedentemente
  const testContenuti = await prisma.contenutiMonitorati.findMany({
    where: {
      piattaforma: {
        in: ['google_news', 'wordpress', 'serpapi_google_news', 'facebook', 'amazon']
      },
      imageUrl: {
        contains: 'unsplash'
      }
    }
  });

  console.log(`📊 Trovati ${testContenuti.length} contenuti di test da aggiornare`);

  // URL più affidabili - immagini di bottiglie di olio da placeholder services
  const reliableImageUrls = [
    'https://picsum.photos/800/600?random=1', // Placeholder affidabile
    'https://picsum.photos/800/600?random=2',
    'https://picsum.photos/800/600?random=3',
    'https://picsum.photos/800/600?random=4',
    'https://picsum.photos/800/600?random=5'
  ];

  let updated = 0;
  
  for (let i = 0; i < testContenuti.length; i++) {
    const contenuto = testContenuti[i];
    const newUrl = reliableImageUrls[i] || reliableImageUrls[0];
    
    try {
      await prisma.contenutiMonitorati.update({
        where: { id: contenuto.id },
        data: { imageUrl: newUrl }
      });
      console.log(`✅ Aggiornato contenuto ${i + 1}: ${newUrl}`);
      updated++;
    } catch (error) {
      console.error(`❌ Errore aggiornamento contenuto ${contenuto.id}:`, error);
    }
  }

  console.log(`\n📊 Aggiornati ${updated} contenuti su ${testContenuti.length}`);
  console.log(`\n🎯 Ricarica la pagina Contenuti Monitorati e prova la verifica!`);
}

fixTestContenutiUrls()
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

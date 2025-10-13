import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function insertTestContenutiConImmagini() {
  console.log('🧪 Inserimento contenuti di test con immagini...');

  const testContenuti = [
    {
      fonte: 'news',
      piattaforma: 'google_news',
      testo: 'Nuovo riconoscimento per l\'olio extravergine DOP del Lazio. Il consorzio presenta l\'etichetta rinnovata che garantisce la qualità del prodotto. L\'immagine mostra la nuova etichetta con la certificazione europea.',
      url: 'https://example.com/news/olio-dop-lazio-nuova-etichetta',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
      autore: 'Redazione AgriNews',
      sentiment: 'positivo',
      sentimentScore: 0.85,
      keywords: ['DOP', 'etichetta', 'certificazione', 'qualità'],
      dataPost: new Date('2025-10-12'),
      rilevanza: 92,
      metadata: {
        imageDetection: {
          source: 'og:image',
          detectedAt: new Date().toISOString()
        }
      }
    },
    {
      fonte: 'blog',
      piattaforma: 'wordpress',
      testo: 'Come riconoscere un autentico olio IGP Roma: guida alle etichette. In questo articolo mostriamo le caratteristiche distintive delle etichette ufficiali, con particolare attenzione ai simboli di certificazione.',
      url: 'https://example.com/blog/riconoscere-olio-igp',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
      autore: 'Marco Rossi',
      sentiment: 'neutro',
      sentimentScore: 0.15,
      keywords: ['IGP', 'etichetta', 'certificazione', 'Roma'],
      dataPost: new Date('2025-10-11'),
      rilevanza: 78,
      metadata: {
        imageDetection: {
          source: 'img_tag',
          detectedAt: new Date().toISOString()
        }
      }
    },
    {
      fonte: 'news',
      piattaforma: 'serpapi_google_news',
      testo: 'Sequestrate 500 bottiglie di olio con etichette contraffatte. Le autorità hanno individuato prodotti con marchi DOP falsi. Le immagini delle etichette false sono state confrontate con quelle ufficiali del consorzio.',
      url: 'https://example.com/news/sequestro-olio-falso',
      imageUrl: 'https://images.unsplash.com/photo-1609692814857-f375b6e15a1f?w=800',
      autore: 'Cronaca Locale',
      sentiment: 'negativo',
      sentimentScore: -0.72,
      keywords: ['contraffazione', 'DOP', 'etichetta', 'sequestro'],
      dataPost: new Date('2025-10-10'),
      rilevanza: 95,
      metadata: {
        imageDetection: {
          source: 'twitter:image',
          detectedAt: new Date().toISOString()
        }
      }
    },
    {
      fonte: 'social',
      piattaforma: 'facebook',
      testo: 'Scoperto nel nostro punto vendita un incredibile olio del Lazio con etichetta artigianale bellissima! 🫒 Confezione elegante con il logo DOP ben visibile.',
      url: 'https://example.com/fb/post/123456',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600',
      autore: 'Gastronomia Del Borgo',
      sentiment: 'positivo',
      sentimentScore: 0.68,
      keywords: ['DOP', 'etichetta', 'Lazio', 'artigianale'],
      dataPost: new Date('2025-10-13'),
      rilevanza: 65,
      metadata: {
        imageDetection: {
          source: 'direct_url',
          detectedAt: new Date().toISOString()
        }
      }
    },
    {
      fonte: 'ecommerce',
      piattaforma: 'amazon',
      testo: 'Olio Extravergine di Oliva IGP Lazio - Bottiglia 750ml. Prodotto certificato con etichetta originale del consorzio. Spedizione gratuita.',
      url: 'https://example.com/amazon/olio-igp-lazio',
      imageUrl: 'https://images.unsplash.com/photo-1600476356905-ce2c3b2960e7?w=800',
      autore: 'Oleificio Tradizione',
      sentiment: 'positivo',
      sentimentScore: 0.55,
      keywords: ['IGP', 'Lazio', 'certificato', 'etichetta'],
      dataPost: new Date('2025-10-09'),
      rilevanza: 70,
      metadata: {
        imageDetection: {
          source: 'og:image',
          detectedAt: new Date().toISOString()
        }
      }
    }
  ];

  let inserted = 0;
  let errors = 0;

  for (const contenuto of testContenuti) {
    try {
      await prisma.contenutiMonitorati.create({
        data: contenuto
      });
      console.log(`✅ Inserito: "${contenuto.testo.substring(0, 60)}..."`);
      inserted++;
    } catch (error) {
      console.error(`❌ Errore inserimento:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Riepilogo:`);
  console.log(`   ✅ Inseriti: ${inserted}`);
  console.log(`   ❌ Errori: ${errors}`);
  console.log(`\n🎯 Vai su Dashboard → Contenuti Monitorati per vedere i contenuti con badge 📷`);
  console.log(`   Clicca "🔍 Verifica Etichetta" per testare la verifica semi-automatica!`);
}

insertTestContenutiConImmagini()
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

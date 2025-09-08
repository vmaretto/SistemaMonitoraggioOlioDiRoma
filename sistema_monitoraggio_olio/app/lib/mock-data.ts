
/**
 * Dati simulati per il demo del sistema di monitoraggio
 */

export const mockKeywords = [
  {
    id: '1',
    keyword: 'Olio Roma DOP',
    categoria: 'primarie',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  },
  {
    id: '2',
    keyword: 'Olio Lazio IGP',
    categoria: 'primarie',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  },
  {
    id: '3',
    keyword: 'Olio Extravergine Roma',
    categoria: 'primarie',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  },
  {
    id: '4',
    keyword: 'Consorzio Olio Roma',
    categoria: 'secondarie',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  },
  {
    id: '5',
    keyword: 'Olio Toscano',
    categoria: 'competitor',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  },
  {
    id: '6',
    keyword: 'Olio Umbro',
    categoria: 'competitor',
    isActive: true,
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-08-15T10:00:00Z'
  }
];

export const mockContenutiMonitorati = [
  {
    id: '1',
    fonte: 'social',
    piattaforma: 'Instagram',
    testo: 'Appena provato questo fantastico Olio Extravergine Roma DOP! Qualita incredibile, sapore autentico che ricorda le tradizioni del Lazio. Il Consorzio Olio Roma ha fatto davvero un ottimo lavoro. Consigliatissimo per chi cerca prodotti genuini!',
    url: 'https://instagram.com/p/foodlover123',
    autore: '@foodlover_roma',
    sentiment: 'positivo',
    sentimentScore: 0.85,
    keywords: ['Olio Extravergine Roma', 'Consorzio Olio Roma', 'Olio Roma DOP'],
    dataPost: '2025-09-05T14:30:00Z',
    rilevanza: 95,
    createdAt: '2025-09-05T14:35:00Z'
  },
  {
    id: '2',
    fonte: 'ecommerce',
    piattaforma: 'Amazon',
    testo: 'Olio Lazio IGP - Recensione: Prodotto di buona qualita ma prezzo un po elevato rispetto alla concorrenza. Il sapore e intenso, tipico della tradizione laziale. Packaging curato.',
    url: 'https://amazon.it/dp/B123456789',
    autore: 'Marco_R',
    sentiment: 'neutro',
    sentimentScore: 0.15,
    keywords: ['Olio Lazio IGP'],
    dataPost: '2025-09-05T12:15:00Z',
    rilevanza: 70,
    createdAt: '2025-09-05T12:20:00Z'
  },
  {
    id: '3',
    fonte: 'blog',
    piattaforma: 'WordPress',
    testo: 'Confronto oli: Ho testato diversi oli regionali. L Olio Toscano resta la mia prima scelta per corpo e intensita, mentre l Olio Roma DOP ha un profilo piu delicato. Entrambi ottimi ma per palati diversi.',
    url: 'https://oleoblog.it/confronto-oli-regionali',
    autore: 'Chef Alessandro',
    sentiment: 'neutro',
    sentimentScore: 0.25,
    keywords: ['Olio Toscano', 'Olio Roma DOP'],
    dataPost: '2025-09-05T09:45:00Z',
    rilevanza: 80,
    createdAt: '2025-09-05T10:00:00Z'
  },
  {
    id: '4',
    fonte: 'social',
    piattaforma: 'Facebook',
    testo: 'Delusa dall acquisto dell Olio Extravergine Roma presso il supermercato. Sapore non all altezza delle aspettative, forse non era fresco. Preferisco rimanere sul mio solito Olio Umbro che non delude mai.',
    url: 'https://facebook.com/groups/cucina-italiana/posts/456789',
    autore: 'Lucia Marini',
    sentiment: 'negativo',
    sentimentScore: -0.65,
    keywords: ['Olio Extravergine Roma', 'Olio Umbro'],
    dataPost: '2025-09-05T16:22:00Z',
    rilevanza: 85,
    createdAt: '2025-09-05T16:25:00Z'
  },
  {
    id: '5',
    fonte: 'news',
    piattaforma: 'Google News',
    testo: 'Il Consorzio Olio Roma ha annunciato la nuova campagna per la promozione dell Olio Lazio IGP sui mercati internazionali. L iniziativa punta a valorizzare la qualita dei prodotti del territorio laziale.',
    url: 'https://newsroma.it/consorzio-olio-campagna-internazionale',
    autore: 'Redazione NewsRoma',
    sentiment: 'positivo',
    sentimentScore: 0.55,
    keywords: ['Consorzio Olio Roma', 'Olio Lazio IGP'],
    dataPost: '2025-09-05T08:30:00Z',
    rilevanza: 90,
    createdAt: '2025-09-05T08:35:00Z'
  },
  {
    id: '6',
    fonte: 'ecommerce',
    piattaforma: 'eBay',
    testo: 'Vendita Olio Roma DOP biologico, produzione 2024. Bottiglia da 500ml, nuovo mai aperto. Qualita garantita dal produttore. Ideale per condimenti a crudo. Prezzo affare!',
    url: 'https://ebay.it/itm/olio-roma-dop-bio',
    autore: 'OlioVendita_Roma',
    sentiment: 'positivo',
    sentimentScore: 0.40,
    keywords: ['Olio Roma DOP'],
    dataPost: '2025-09-05T11:10:00Z',
    rilevanza: 75,
    createdAt: '2025-09-05T11:15:00Z'
  },
  {
    id: '7',
    fonte: 'social',
    piattaforma: 'Twitter',
    testo: 'Degustazione oli al salone del gusto: Olio Toscano sempre una garanzia! L Olio Umbro quest anno e migliorato molto. Curious about Olio Lazio IGP che non conoscevo #OlioEVO #Degustazione',
    url: 'https://twitter.com/gustoitaliano/status/123456',
    autore: '@gustoitaliano',
    sentiment: 'neutro',
    sentimentScore: 0.30,
    keywords: ['Olio Toscano', 'Olio Umbro', 'Olio Lazio IGP'],
    dataPost: '2025-09-04T20:15:00Z',
    rilevanza: 75,
    createdAt: '2025-09-04T20:20:00Z'
  },
  {
    id: '8',
    fonte: 'blog',
    piattaforma: 'Medium',
    testo: 'Guida agli oli regionali italiani: il Consorzio Olio Roma rappresenta l eccellenza della produzione laziale. L Olio Roma DOP si distingue per fruttato medio e note di erba fresca. Un prodotto che merita di essere conosciuto meglio.',
    url: 'https://medium.com/@oleoguru/guida-oli-regionali-italia',
    autore: 'OleoGuru',
    sentiment: 'positivo',
    sentimentScore: 0.75,
    keywords: ['Consorzio Olio Roma', 'Olio Roma DOP'],
    dataPost: '2025-09-04T15:00:00Z',
    rilevanza: 95,
    createdAt: '2025-09-04T15:05:00Z'
  }
];

export const mockStatistiche = {
  contenutiTotali: mockContenutiMonitorati.length,
  contenutiPositivi: mockContenutiMonitorati.filter(c => c.sentiment === 'positivo').length,
  contenutiNegativi: mockContenutiMonitorati.filter(c => c.sentiment === 'negativo').length,
  contenutiNeutri: mockContenutiMonitorati.filter(c => c.sentiment === 'neutro').length,
  keywordAttive: mockKeywords.filter(k => k.isActive).length,
  piattaforme: {
    'Instagram': 1,
    'Amazon': 1,
    'WordPress': 1,
    'Facebook': 1,
    'Google News': 1,
    'eBay': 1,
    'Twitter': 1,
    'Medium': 1
  },
  sentimentMedio: 0.2
};

/**
 * Funzione per popolare il database con dati demo
 */
export async function seedDemoData(prisma: any) {
  try {
    // Pulisce i dati esistenti
    await prisma.contenutiMonitorati.deleteMany({});
    await prisma.keywords.deleteMany({});

    // Inserisce le keywords
    for (const keyword of mockKeywords) {
      await prisma.keywords.create({
        data: {
          keyword: keyword.keyword,
          categoria: keyword.categoria,
          isActive: keyword.isActive,
          createdAt: new Date(keyword.createdAt),
          updatedAt: new Date(keyword.updatedAt)
        }
      });
    }

    // Inserisce i contenuti
    for (const contenuto of mockContenutiMonitorati) {
      await prisma.contenutiMonitorati.create({
        data: {
          fonte: contenuto.fonte,
          piattaforma: contenuto.piattaforma,
          testo: contenuto.testo,
          url: contenuto.url,
          autore: contenuto.autore,
          sentiment: contenuto.sentiment,
          sentimentScore: contenuto.sentimentScore,
          keywords: contenuto.keywords,
          dataPost: new Date(contenuto.dataPost),
          rilevanza: contenuto.rilevanza,
          createdAt: new Date(contenuto.createdAt)
        }
      });
    }

    console.log('✅ Dati demo caricati con successo');
    return { success: true, message: 'Dati demo caricati con successo' };

  } catch (error) {
    console.error('❌ Errore nel caricamento dati demo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
  }
}

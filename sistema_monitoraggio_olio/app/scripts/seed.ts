
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inizializzazione seed database...');
  
  // 1. UTENTI E AUTENTICAZIONE
  console.log('👤 Creazione utenti...');
  
  const hashedPassword = await bcryptjs.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@consorzio-olio-roma.it' },
    update: {},
    create: {
      email: 'admin@consorzio-olio-roma.it',
      name: 'Direttore Consorzio',
      password: hashedPassword,
      role: 'direttore',
      organization: 'Consorzio Olio Roma-Lazio'
    }
  });

  // Account di test
  const testPassword = await bcryptjs.hash('johndoe123', 10);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: testPassword,
      role: 'admin'
    }
  });

  // 2. KEYWORDS DI MONITORAGGIO
  console.log('🔍 Creazione keywords...');
  
  const keywords = [
    { keyword: 'Olio Roma', category: 'primary' },
    { keyword: 'Olio Lazio', category: 'primary' },
    { keyword: 'Olio DOP Sabina', category: 'primary' },
    { keyword: 'Olio IGP Lazio', category: 'primary' },
    { keyword: 'Olio extravergine romano', category: 'secondary' },
    { keyword: 'Olio Castelli Romani', category: 'secondary' },
    { keyword: 'Frantoio Lazio', category: 'secondary' },
    { keyword: 'Olio Toscano', category: 'competitor' },
    { keyword: 'Olio Umbro', category: 'competitor' },
    { keyword: 'Olio pugliese', category: 'competitor' }
  ];

  for (const kw of keywords) {
    await prisma.keywords.upsert({
      where: { keyword: kw.keyword },
      update: {},
      create: kw
    });
  }

  // 3. ETICHETTE UFFICIALI
  console.log('🏷️ Creazione etichette ufficiali...');
  
  const etichette = [
    {
      nome: 'Olio Extravergine DOP Sabina',
      descrizione: 'Etichetta ufficiale per olio DOP Sabina della provincia di Rieti',
      imageUrl: 'https://cdn.abacus.ai/images/8824492c-ce06-4b8d-ac73-66d55b7f101c.png',
      denominazione: 'DOP',
      produttore: 'Oleificio Sabino - Rieti',
      testoOcr: 'OLIO EXTRAVERGINE DOP SABINA - Oleificio Sabino - Rieti, Lazio - DOP - Raccolto 2024 - 500ml - Acidità max 0.5%'
    },
    {
      nome: 'Olio IGP Lazio Colline Pontine',
      descrizione: 'Etichetta ufficiale per olio IGP delle Colline Pontine',
      imageUrl: 'https://cdn.abacus.ai/images/b40a5ec7-ed83-4daf-95b4-a1819e180ccc.png',
      denominazione: 'IGP',
      produttore: 'Frantoio Pontino - Latina',
      testoOcr: 'OLIO IGP LAZIO COLLINE PONTINE - Frantoio Pontino - Latina, Lazio - IGP - Raccolto 2023 - 750ml - Acidità max 0.8%'
    },
    {
      nome: 'Olio Extravergine Roma Tradizionale',
      descrizione: 'Etichetta tradizionale romana con simboli storici',
      imageUrl: 'https://cdn.abacus.ai/images/e61f3063-030a-4e1d-b598-fa8e07d5f9d5.png',
      denominazione: 'DOP',
      produttore: 'Oleificio Romano - Roma',
      testoOcr: 'OLIO EXTRAVERGINE ROMA TRADIZIONALE - Oleificio Romano - Roma, Lazio - DOP - Raccolto 2024 - 500ml'
    },
    {
      nome: 'Olio DOP Canino',
      descrizione: 'Etichetta rustica per olio della zona di Canino',
      imageUrl: 'https://cdn.abacus.ai/images/56c8b3cb-9fa6-4d52-a097-218303529f58.png',
      denominazione: 'DOP',
      produttore: 'Frantoio di Canino - Viterbo',
      testoOcr: 'OLIO DOP CANINO - Frantoio di Canino - Viterbo, Lazio - DOP - Raccolto 2023 - 500ml - Spremitura a freddo'
    },
    {
      nome: 'Olio Extravergine Frascati Hills',
      descrizione: 'Etichetta elegante per olio delle colline di Frascati',
      imageUrl: 'https://cdn.abacus.ai/images/86e1eea1-d0e4-4b3b-b243-e44703c3acbd.png',
      denominazione: 'IGP',
      produttore: 'Oleificio Frascati',
      testoOcr: 'OLIO EXTRAVERGINE FRASCATI HILLS - Oleificio Frascati - Frascati, Lazio - Raccolto 2024 - 750ml'
    },
    {
      nome: 'Olio IGP Colli Albani',
      descrizione: 'Etichetta contemporanea per olio dei Colli Albani',
      imageUrl: 'https://cdn.abacus.ai/images/9164e25a-3fc0-4f27-a777-91ad73d01231.png',
      denominazione: 'IGP',
      produttore: 'Frantoio Albano',
      testoOcr: 'OLIO IGP COLLI ALBANI - Frantoio Albano - Albano Laziale, Lazio - IGP - Raccolto 2023 - 500ml'
    },
    {
      nome: 'Olio Roma Capitale DOP',
      descrizione: 'Etichetta premium con simboli romani',
      imageUrl: 'https://cdn.abacus.ai/images/b03dc679-415d-4b36-990e-4776584105b1.png',
      denominazione: 'DOP',
      produttore: 'Oleificio Capitolino - Roma',
      testoOcr: 'OLIO ROMA CAPITALE DOP - Oleificio Capitolino - Roma, Lazio - DOP - Raccolto 2024 - 750ml - Premium Quality'
    },
    {
      nome: 'Olio Tradizionale Castelli Romani',
      descrizione: 'Etichetta heritage con stemma familiare',
      imageUrl: 'https://cdn.abacus.ai/images/14573529-1ea3-4e99-a7a6-af1c15d5995f.png',
      denominazione: 'DOP',
      produttore: 'Frantoio dei Castelli - Genzano',
      testoOcr: 'OLIO TRADIZIONALE CASTELLI ROMANI - Frantoio dei Castelli - Genzano, Lazio - Tradizione dal 1850 - Raccolto 2023 - 500ml'
    },
    {
      nome: 'Olio Extravergine Tuscia IGP',
      descrizione: 'Etichetta minimalista per olio della Tuscia',
      imageUrl: 'https://cdn.abacus.ai/images/8281b945-d3b1-4e35-85a0-b538cdabd4b2.png',
      denominazione: 'IGP',
      produttore: 'Oleificio Tuscia - Viterbo',
      testoOcr: 'OLIO EXTRAVERGINE TUSCIA IGP - Oleificio Tuscia - Viterbo, Lazio - IGP - Raccolto 2024 - 500ml'
    },
    {
      nome: 'Olio DOP Soratte',
      descrizione: 'Etichetta montana con paesaggio collinare',
      imageUrl: 'https://cdn.abacus.ai/images/4e855d27-a53d-487a-b630-ebfe430b5e17.png',
      denominazione: 'DOP',
      produttore: 'Frantoio Monte Soratte',
      testoOcr: 'OLIO DOP SORATTE - Frantoio Monte Soratte - Sant\'Oreste, Lazio - DOP - Raccolto 2023 - 750ml - Montagna'
    },
    {
      nome: 'Olio Biologico Lazio Sud',
      descrizione: 'Etichetta biologica certificata',
      imageUrl: 'https://cdn.abacus.ai/images/20fbcda1-b08d-4b57-b68e-3bf53f6335b0.png',
      denominazione: 'BIO',
      produttore: 'Oleificio Bio Sud - Frosinone',
      testoOcr: 'OLIO BIOLOGICO LAZIO SUD - Oleificio Bio Sud - Frosinone, Lazio - BIOLOGICO - Certificato IT-BIO-009 - Raccolto 2024 - 500ml'
    },
    {
      nome: 'Olio Extravergine Latina DOP',
      descrizione: 'Etichetta costiera con temi marini',
      imageUrl: 'https://cdn.abacus.ai/images/2baa8b9d-dfbb-46ee-b7b5-7b62b2bf9e4b.png',
      denominazione: 'DOP',
      produttore: 'Frantoio Costiero - Latina',
      testoOcr: 'OLIO EXTRAVERGINE LATINA DOP - Frantoio Costiero - Latina, Lazio - DOP - Raccolto 2023 - 750ml - Costa del Lazio'
    }
  ];

  for (const etichetta of etichette) {
    await prisma.etichetteUfficiali.create({
      data: etichetta
    });
  }

  // 4. CONTENUTI MONITORATI
  console.log('📱 Creazione contenuti monitorati...');
  
  // Genero contenuti degli ultimi 30 giorni
  const now = new Date();
  const contenuti = [];

  // Contenuti positivi
  const contenutiPositivi = [
    {
      fonte: 'social',
      piattaforma: 'facebook',
      testo: 'Appena assaggiato l\'olio DOP Sabina del Lazio, che bontà! Il vero sapore della tradizione romana. #OlioRoma',
      autore: 'Marco Romano',
      sentiment: 'positivo',
      sentimentScore: 0.8,
      keywords: ['Olio Roma', 'DOP Sabina'],
      rilevanza: 85
    },
    {
      fonte: 'ecommerce',
      piattaforma: 'amazon',
      testo: 'Olio extravergine del Lazio eccezionale! Consegna veloce, prodotto di qualità superiore. Consigliatissimo per chi cerca il vero olio romano.',
      autore: 'Cliente Amazon',
      sentiment: 'positivo',
      sentimentScore: 0.9,
      keywords: ['Olio Lazio'],
      rilevanza: 90
    },
    {
      fonte: 'blog',
      piattaforma: 'gustoblog',
      testo: 'Il tour dei frantoi dei Castelli Romani ci ha fatto scoprire perle nascoste. L\'olio IGP Lazio è davvero un\'eccellenza del territorio.',
      autore: 'GustoItalia',
      sentiment: 'positivo',
      sentimentScore: 0.7,
      keywords: ['Olio IGP Lazio', 'Castelli Romani'],
      rilevanza: 75
    },
    {
      fonte: 'social',
      piattaforma: 'instagram',
      testo: 'Colazione perfetta con il pane tostato e olio extravergine romano DOP 🫒 #slowfood #OlioRoma #madeinLazio',
      autore: 'foodie_roma',
      sentiment: 'positivo',
      sentimentScore: 0.6,
      keywords: ['Olio Roma'],
      rilevanza: 70
    },
    {
      fonte: 'news',
      piattaforma: 'corriere_roma',
      testo: 'Il consorzio dell\'olio del Lazio presenta i nuovi standard di qualità. Un passo avanti per la valorizzazione delle DOP laziali.',
      autore: 'Redazione',
      sentiment: 'positivo',
      sentimentScore: 0.8,
      keywords: ['Olio Lazio', 'DOP'],
      rilevanza: 95
    }
  ];

  // Contenuti neutri
  const contenutiNeutri = [
    {
      fonte: 'news',
      piattaforma: 'repubblica_roma',
      testo: 'Il prezzo dell\'olio extravergine di oliva del Lazio resta stabile rispetto al trimestre precedente secondo i dati ISMEA.',
      autore: 'Redazione Economia',
      sentiment: 'neutro',
      sentimentScore: 0.0,
      keywords: ['Olio Lazio'],
      rilevanza: 60
    },
    {
      fonte: 'social',
      piattaforma: 'twitter',
      testo: 'Al supermercato ho visto diversi oli del Lazio. Qualcuno ha provato quello DOP Sabina?',
      autore: 'utente_twitter',
      sentiment: 'neutro',
      sentimentScore: 0.1,
      keywords: ['Olio Lazio', 'DOP Sabina'],
      rilevanza: 50
    },
    {
      fonte: 'forum',
      piattaforma: 'alfemminile',
      testo: 'Sto cercando un buon olio extravergine per condire le insalate. Consigli su marche del Lazio?',
      autore: 'cucina_casalinga',
      sentiment: 'neutro',
      sentimentScore: 0.2,
      keywords: ['Olio Lazio'],
      rilevanza: 45
    }
  ];

  // Contenuti negativi
  const contenutiNegativi = [
    {
      fonte: 'social',
      piattaforma: 'facebook',
      testo: 'Comprato olio che dicevano essere DOP del Lazio ma il sapore non mi convince. Forse era contraffatto?',
      autore: 'consumatore_attento',
      sentiment: 'negativo',
      sentimentScore: -0.6,
      keywords: ['DOP', 'Olio Lazio'],
      rilevanza: 85
    },
    {
      fonte: 'ecommerce',
      piattaforma: 'eprice',
      testo: 'Olio romano acquistato online arrivato con difetti nella bottiglia. Qualità del prodotto deludente per il prezzo pagato.',
      autore: 'Cliente insoddisfatto',
      sentiment: 'negativo',
      sentimentScore: -0.7,
      keywords: ['Olio Roma'],
      rilevanza: 75
    },
    {
      fonte: 'blog',
      piattaforma: 'dissapore',
      testo: 'Test comparativo oli laziali: alcuni prodotti non rispettano gli standard dichiarati in etichetta.',
      autore: 'Test Qualità',
      sentiment: 'negativo',
      sentimentScore: -0.5,
      keywords: ['Olio Lazio'],
      rilevanza: 90
    }
  ];

  // Genero contenuti per gli ultimi 30 giorni
  for (let i = 0; i < 30; i++) {
    const dataPost = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    
    // Distribuzione realistica: 50% positivi, 30% neutri, 20% negativi
    const rand = Math.random();
    let contenutoBase;
    
    if (rand < 0.5) {
      contenutoBase = contenutiPositivi[Math.floor(Math.random() * contenutiPositivi.length)];
    } else if (rand < 0.8) {
      contenutoBase = contenutiNeutri[Math.floor(Math.random() * contenutiNeutri.length)];
    } else {
      contenutoBase = contenutiNegativi[Math.floor(Math.random() * contenutiNegativi.length)];
    }

    contenuti.push({
      ...contenutoBase,
      dataPost,
      url: `https://${contenutoBase.piattaforma}.com/post/${Date.now()}_${i}`,
      createdAt: dataPost
    });

    // Aggiungi qualche contenuto extra per alcuni giorni
    if (i % 3 === 0) {
      const contenutoExtra = contenutiPositivi[Math.floor(Math.random() * contenutiPositivi.length)];
      contenuti.push({
        ...contenutoExtra,
        dataPost: new Date(dataPost.getTime() + (2 * 60 * 60 * 1000)),
        url: `https://${contenutoExtra.piattaforma}.com/post/${Date.now()}_${i}_extra`,
        createdAt: new Date(dataPost.getTime() + (2 * 60 * 60 * 1000))
      });
    }
  }

  for (const contenuto of contenuti) {
    await prisma.contenutiMonitorati.create({
      data: contenuto
    });
  }

  // 5. VERIFICHE ETICHETTE
  console.log('✅ Creazione verifiche etichette...');
  
  const verifiche = [
    {
      imageUrl: 'https://www.oliveoilsitaly.com/5308-large_default/extra-virgin-olive-oil-olio-di-roma-igp-quattrociocchi-500ml.jpg',
      testoOcr: 'OLIO EXTRAVERGINE ROMA - Prodotto in Lazio - 500ml',
      risultatoMatching: 'conforme',
      percentualeMatch: 85.5,
      violazioniRilevate: [],
      note: 'Etichetta conforme agli standard DOP',
      stato: 'verificata'
    },
    {
      imageUrl: 'http://ciaoimports.com/cdn/shop/files/RomanoFrantoioBasilCo-milledExtraVirginOliveOil250ml_1200x630.jpg?v=1746036167',
      testoOcr: 'OLIO DEL COLOSSEO - Tradizione Romana - Roma Antica - 750ml',
      risultatoMatching: 'non_conforme',
      percentualeMatch: 25.0,
      violazioniRilevate: ['uso_simboli_romani_non_autorizzati', 'evocazione_colosseo'],
      note: 'Uso illecito di simboli romani e riferimenti al Colosseo',
      stato: 'verificata'
    },
    {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Lupa_Capitolina%2C_Rome.jpg',
      testoOcr: 'OLIO ROMANESCO - La Lupa Capitolina - Prodotto tradizionale',
      risultatoMatching: 'sospetta',
      percentualeMatch: 45.0,
      violazioniRilevate: ['evocazione_lupa_capitolina', 'uso_termine_romanesco'],
      note: 'Possibile uso improprio di simboli romani',
      stato: 'da_verificare'
    }
  ];

  for (const verifica of verifiche) {
    await prisma.verificheEtichette.create({
      data: verifica
    });
  }

  // 6. ALERT
  console.log('🚨 Creazione alert...');
  
  const alerts = [
    {
      tipo: 'sentiment_negativo',
      priorita: 'critico',
      titolo: 'Picco di recensioni negative',
      descrizione: 'Rilevato aumento del 40% di contenuti negativi sull\'olio romano nelle ultime 48 ore',
      fonte: 'monitoraggio_sentiment',
      isRisolto: false,
      isNotificato: true
    },
    {
      tipo: 'etichetta_sospetta',
      priorita: 'medio',
      titolo: 'Etichetta con simboli non autorizzati',
      descrizione: 'Rilevata etichetta con uso improprio della Lupa Capitolina',
      fonte: 'verifica_etichette',
      isRisolto: false,
      isNotificato: true
    },
    {
      tipo: 'picco_menzioni',
      priorita: 'basso',
      titolo: 'Aumento menzioni positive',
      descrizione: 'Incremento del 25% delle menzioni positive per DOP Sabina',
      fonte: 'monitoraggio_keyword',
      isRisolto: true,
      isNotificato: true,
      dataRisolto: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000))
    }
  ];

  for (const alert of alerts) {
    await prisma.alert.create({
      data: alert
    });
  }

  // 7. CONFIGURAZIONI
  console.log('⚙️ Creazione configurazioni...');
  
  const configurazioni = [
    {
      chiave: 'soglia_sentiment_critico',
      valore: '-0.6',
      descrizione: 'Soglia per alert sentiment critico',
      categoria: 'monitoraggio'
    },
    {
      chiave: 'soglia_matching_etichette',
      valore: '70',
      descrizione: 'Percentuale minima per matching positivo etichette',
      categoria: 'etichette'
    },
    {
      chiave: 'email_notifiche',
      valore: 'admin@consorzio-olio-roma.it',
      descrizione: 'Email per invio notifiche',
      categoria: 'notifiche'
    },
    {
      chiave: 'intervallo_monitoraggio',
      valore: '60',
      descrizione: 'Intervallo monitoraggio in minuti',
      categoria: 'monitoraggio'
    },
    {
      chiave: 'parole_vietate',
      valore: JSON.stringify(['Colosseo', 'Lupa Capitolina', 'SPQR', 'Campidoglio']),
      descrizione: 'Parole vietate nelle etichette',
      categoria: 'etichette'
    }
  ];

  for (const config of configurazioni) {
    await prisma.configurazioni.upsert({
      where: { chiave: config.chiave },
      update: {},
      create: config
    });
  }

  // 8. LOG NOTIFICHE
  console.log('📧 Creazione log notifiche...');
  
  const logNotifiche = [
    {
      tipo: 'email',
      destinatario: 'admin@consorzio-olio-roma.it',
      oggetto: 'Alert Critico - Picco Sentiment Negativo',
      corpo: 'Rilevato aumento significativo di contenuti negativi. Richiesta verifica urgente.',
      stato: 'inviata',
      alertId: 'alert_1'
    },
    {
      tipo: 'email',
      destinatario: 'admin@consorzio-olio-roma.it',
      oggetto: 'Verifica Etichetta Sospetta',
      corpo: 'Nuova etichetta richiede verifica manuale per possibili violazioni.',
      stato: 'inviata',
      alertId: 'alert_2'
    }
  ];

  for (const log of logNotifiche) {
    await prisma.logNotifiche.create({
      data: log
    });
  }

  console.log('✅ Seed completato con successo!');
  console.log(`
📊 RIEPILOGO DATI CREATI:
- 👤 Utenti: 2 (admin + test)
- 🔍 Keywords: 10 
- 🏷️ Etichette ufficiali: 12
- 📱 Contenuti monitorati: ~45 (ultimi 30 giorni)
- ✅ Verifiche etichette: 3
- 🚨 Alert: 3
- ⚙️ Configurazioni: 5
- 📧 Log notifiche: 2

🔑 CREDENZIALI TEST:
- Admin: admin@consorzio-olio-roma.it / admin123
- Test: john@doe.com / johndoe123
  `);
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

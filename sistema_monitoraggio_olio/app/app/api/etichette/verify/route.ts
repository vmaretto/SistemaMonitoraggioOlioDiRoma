
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File immagine richiesto' }, { status: 400 });
    }

    // Simulazione OCR - In realtà useresti il LLM API per estrarre il testo
    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');

    // Chiamata al LLM API per OCR simulato
    const ocrResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Estrai tutto il testo visibile da questa etichetta di olio d\'oliva. Concentrati su: nome prodotto, produttore, denominazione (DOP/IGP), zona geografica, volume, anno di raccolta, e qualsiasi altro testo presente. Fornisci solo il testo estratto, senza commenti aggiuntivi.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64String}`
              }
            }
          ]
        }],
        max_tokens: 1000
      })
    });

    if (!ocrResponse.ok) {
      throw new Error('Errore nell\'estrazione OCR');
    }

    const ocrData = await ocrResponse.json();
    const testoOcr = ocrData.choices?.[0]?.message?.content || '';

    // Analisi conformità con LLM
    const conformityResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{
          role: 'user',
          content: `Analizza la conformità di questa etichetta di olio d'oliva del Lazio/Roma.

Testo estratto dall'etichetta: "${testoOcr}"

Verifica la presenza di:
1. Violazioni per uso improprio di simboli romani (Colosseo, Lupa Capitolina, SPQR, Campidoglio)
2. Evocazioni non autorizzate del territorio romano
3. Riferimenti geografici non conformi
4. Denominazioni DOP/IGP non corrette

Confronta con le etichette ufficiali del database e fornisci:
{
  "risultato": "conforme|non_conforme|sospetta",
  "percentualeMatch": numero_0_100,
  "violazioni": ["lista_violazioni_trovate"],
  "note": "spiegazione_dettagliata",
  "raccomandazioni": "suggerimenti_per_conformità"
}

Rispondi solo con JSON valido.`
        }],
        max_tokens: 1000,
        temperature: 0.2
      })
    });

    const conformityData = await conformityResponse.json();
    let analysis;
    
    try {
      analysis = JSON.parse(conformityData.choices?.[0]?.message?.content || '{}');
    } catch {
      // Fallback analysis
      const paroleBanned = ['colosseo', 'lupa capitolina', 'spqr', 'campidoglio'];
      const testoLower = testoOcr.toLowerCase();
      const violazioniTrovate = paroleBanned.filter(parola => testoLower.includes(parola));
      
      analysis = {
        risultato: violazioniTrovate.length > 0 ? 'non_conforme' : 'conforme',
        percentualeMatch: violazioniTrovate.length > 0 ? 25 : 85,
        violazioni: violazioniTrovate.map(v => `uso_non_autorizzato_${v.replace(' ', '_')}`),
        note: violazioniTrovate.length > 0 ? 
          `Rilevate violazioni: ${violazioniTrovate.join(', ')}` : 
          'Etichetta sembra conforme agli standard',
        raccomandazioni: violazioniTrovate.length > 0 ? 
          'Rimuovere i riferimenti non autorizzati ai simboli romani' : 
          'Etichetta approvata'
      };
    }

    // Salva la verifica nel database
    const verifica = await prisma.verificheEtichette.create({
      data: {
        imageUrl: `upload_${Date.now()}.jpg`, // In produzione sarebbe l'URL S3
        testoOcr,
        risultatoMatching: analysis.risultato,
        percentualeMatch: analysis.percentualeMatch,
        violazioniRilevate: analysis.violazioni || [],
        note: analysis.note,
        stato: 'verificata'
      }
    });

    // Crea alert se non conforme
    if (analysis.risultato === 'non_conforme' || analysis.risultato === 'sospetta') {
      await prisma.alert.create({
        data: {
          tipo: 'etichetta_sospetta',
          priorita: analysis.risultato === 'non_conforme' ? 'critico' : 'medio',
          titolo: `Etichetta ${analysis.risultato === 'non_conforme' ? 'non conforme' : 'sospetta'} rilevata`,
          descrizione: `Verifica etichetta: ${analysis.note}. Violazioni: ${analysis.violazioni?.join(', ') || 'Nessuna'}`,
          fonte: verifica.id
        }
      });
    }

    return NextResponse.json({
      success: true,
      verifica: {
        id: verifica.id,
        testoOcr,
        risultato: analysis.risultato,
        percentualeMatch: analysis.percentualeMatch,
        violazioni: analysis.violazioni,
        note: analysis.note,
        raccomandazioni: analysis.raccomandazioni
      }
    });

  } catch (error) {
    console.error('Errore nella verifica etichetta:', error);
    return NextResponse.json({ 
      error: 'Errore nella verifica dell\'etichetta',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

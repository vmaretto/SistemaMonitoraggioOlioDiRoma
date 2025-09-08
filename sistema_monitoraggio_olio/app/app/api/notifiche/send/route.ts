
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

    const { alertId, tipo, destinatario, oggetto, corpo } = await request.json();

    if (!destinatario || !oggetto || !corpo) {
      return NextResponse.json({ error: 'Parametri notifica mancanti' }, { status: 400 });
    }

    // Simulazione invio email (in produzione integrare con servizio email)
    const emailPreview = {
      from: 'sistema-monitoraggio@consorzio-olio-roma.it',
      to: destinatario,
      subject: oggetto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <header style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>Sistema Monitoraggio Olio Roma-Lazio</h1>
          </header>
          <main style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #1f2937;">Notifica Alert</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
              ${corpo}
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
              <p><strong>Azione richiesta:</strong> Accedi al sistema per visualizzare i dettagli e gestire l'alert.</p>
              <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
            </div>
          </main>
          <footer style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>Consorzio per la tutela dell'Olio Extravergine di Oliva Roma-Lazio</p>
            <p>Questo è un messaggio automatico, non rispondere a questa email.</p>
          </footer>
        </div>
      `
    };

    // Salva il log della notifica
    const logNotifica = await prisma.logNotifiche.create({
      data: {
        tipo: tipo || 'email',
        destinatario,
        oggetto,
        corpo,
        stato: 'inviata',
        alertId
      }
    });

    // Aggiorna l'alert come notificato
    if (alertId) {
      await prisma.alert.update({
        where: { id: alertId },
        data: { isNotificato: true }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifica inviata con successo',
      emailPreview, // In produzione non restituire l'HTML completo
      logId: logNotifica.id
    });

  } catch (error) {
    console.error('Errore nell\'invio notifica:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

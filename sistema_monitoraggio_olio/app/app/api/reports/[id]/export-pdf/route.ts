import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  IN_LAVORAZIONE: 'In Lavorazione',
  IN_VERIFICA: 'In Verifica',
  RICHIESTA_CHIARIMENTI: 'Richiesta Chiarimenti',
  SEGNALATO_AUTORITA: 'Segnalato ad Autorita',
  CHIUSO: 'Chiuso',
  ARCHIVIATO: 'Archiviato'
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  'CREAZIONE': 'Report creato',
  'TRANSIZIONE': 'Cambio stato',
  'TRANSIZIONE_STATO': 'Cambio stato',
  'SOPRALLUOGO': 'Sopralluogo registrato',
  'RICHIESTA_CHIARIMENTI': 'Chiarimenti richiesti',
  'FEEDBACK_CHIARIMENTI': 'Feedback ricevuto',
  'INVIO_A_ENTE': 'Segnalato a ente',
  'FEEDBACK_ENTE': 'Feedback ente',
  'CHIUSURA': 'Report chiuso',
  'ALLEGATO_AGGIUNTO': 'Allegato aggiunto',
  'ALLEGATO_RIMOSSO': 'Allegato rimosso',
  'ALLEGATO_MODIFICATO': 'Allegato modificato'
};

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "dd MMM yyyy 'alle' HH:mm", { locale: it });
}

function formatDateOnly(dateStr: string): string {
  return format(new Date(dateStr), "dd MMM yyyy", { locale: it });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const reportId = params.id;

    // Carica tutti i dati del report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' }
        },
        inspections: {
          orderBy: { date: 'desc' },
          include: {
            attachments: {
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        clarifications: {
          orderBy: { requestedAt: 'desc' },
          include: {
            attachments: {
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        authorityNotices: {
          orderBy: { sentAt: 'desc' },
          include: {
            attachments: {
              orderBy: { uploadedAt: 'desc' }
            }
          }
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report non trovato' }, { status: 404 });
    }

    // Crea il PDF con jsPDF
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Helper per aggiungere testo con wrap e gestione pagine
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, indent: number = 0) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');

      const lines = doc.splitTextToSize(text, maxWidth - indent);
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin + indent, yPos);
        yPos += fontSize * 0.5;
      });
    };

    const addSpace = (size: number = 5) => {
      yPos += size;
    };

    const addSeparator = () => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT COMPLETO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Informazioni generali
    addText('Informazioni Generali', 16, true);
    addSpace();

    addText(`Titolo: ${report.title}`, 12, false);
    addText(`ID: ${report.id}`, 10, false);
    addText(`Stato: ${STATUS_LABELS[report.status] || report.status}`, 10, false);
    addText(`Data Creazione: ${formatDate(report.createdAt.toISOString())}`, 10, false);
    addText(`Ultimo Aggiornamento: ${formatDate(report.updatedAt.toISOString())}`, 10, false);

    if (report.description) {
      addSpace();
      addText('Descrizione:', 10, true);
      addText(report.description, 10, false);
    }

    addSpace(10);

    // Timeline
    if (report.actions.length > 0) {
      addText('Timeline Attivita', 16, true);
      addSpace();

      report.actions.forEach((log) => {
        const actionLabel = ACTION_TYPE_LABELS[log.type] || log.type;
        addText(`${formatDate(log.createdAt.toISOString())} - ${actionLabel}`, 11, true);
        addText(log.message, 10, false, 10);
        addSpace(3);
      });

      addSpace(10);
    }

    // Sopralluoghi
    if (report.inspections.length > 0) {
      doc.addPage();
      yPos = 20;

      addText('Sopralluoghi', 16, true);
      addSpace();

      report.inspections.forEach((inspection, index) => {
        addText(`Sopralluogo #${index + 1}`, 12, true);
        addText(`Data: ${formatDate(inspection.date.toISOString())}`, 11, false);

        if (inspection.location) {
          addText(`Localita: ${inspection.location}`, 11, false);
        }

        if (inspection.minutesText) {
          addText('Verbale:', 11, true);
          addText(inspection.minutesText, 10, false);
        }

        if (inspection.outcome) {
          addText(`Esito: ${inspection.outcome}`, 11, false);
        }

        if (inspection.attachments && inspection.attachments.length > 0) {
          addText(`Allegati (${inspection.attachments.length}):`, 11, true);
          inspection.attachments.forEach((att) => {
            addText(`- ${att.originalName || att.filename}`, 9, false, 10);
          });
        }

        if (index < report.inspections.length - 1) {
          addSpace(5);
          addSeparator();
          addSpace(5);
        }
      });

      addSpace(10);
    }

    // Chiarimenti
    if (report.clarifications.length > 0) {
      doc.addPage();
      yPos = 20;

      addText('Richieste di Chiarimenti', 16, true);
      addSpace();

      report.clarifications.forEach((clarification, index) => {
        addText(`Richiesta #${index + 1}`, 12, true);
        addText(`Data Richiesta: ${formatDate(clarification.requestedAt.toISOString())}`, 11, false);

        if (clarification.dueAt) {
          addText(`Scadenza: ${formatDateOnly(clarification.dueAt.toISOString())}`, 11, false);
        }

        addText('Domanda:', 11, true);
        addText(clarification.question, 10, false);

        if (clarification.feedback) {
          addSpace(3);
          addText('Risposta:', 11, true);
          addText(clarification.feedback, 10, false);

          if (clarification.feedbackAt) {
            addText(`Ricevuta il: ${formatDate(clarification.feedbackAt.toISOString())}`, 9, false);
          }
        } else {
          addText('In attesa di risposta', 10, false);
        }

        if (clarification.attachments && clarification.attachments.length > 0) {
          addText(`Allegati (${clarification.attachments.length}):`, 11, true);
          clarification.attachments.forEach((att) => {
            addText(`- ${att.originalName || att.filename}`, 9, false, 10);
          });
        }

        if (index < report.clarifications.length - 1) {
          addSpace(5);
          addSeparator();
          addSpace(5);
        }
      });

      addSpace(10);
    }

    // Segnalazioni
    if (report.authorityNotices.length > 0) {
      doc.addPage();
      yPos = 20;

      addText('Segnalazioni ad Enti', 16, true);
      addSpace();

      report.authorityNotices.forEach((notice, index) => {
        addText(`Segnalazione #${index + 1}`, 12, true);
        addText(`Ente: ${notice.authority}`, 11, false);
        addText(`Data Invio: ${formatDate(notice.sentAt.toISOString())}`, 11, false);

        if (notice.protocol) {
          addText(`Protocollo: ${notice.protocol}`, 11, false);
        }

        if (notice.feedback) {
          addSpace(3);
          addText('Feedback Ricevuto:', 11, true);
          addText(notice.feedback, 10, false);

          if (notice.feedbackAt) {
            addText(`Ricevuto il: ${formatDate(notice.feedbackAt.toISOString())}`, 9, false);
          }
        } else {
          addText('In attesa di feedback', 10, false);
        }

        if (notice.attachments && notice.attachments.length > 0) {
          addText(`Allegati (${notice.attachments.length}):`, 11, true);
          notice.attachments.forEach((att) => {
            addText(`- ${att.originalName || att.filename}`, 9, false, 10);
          });
        }

        if (index < report.authorityNotices.length - 1) {
          addSpace(5);
          addSeparator();
          addSpace(5);
        }
      });

      addSpace(10);
    }

    // Allegati
    if (report.attachments.length > 0) {
      doc.addPage();
      yPos = 20;

      addText('Allegati del Report', 16, true);
      addSpace();
      addText(`Totale allegati: ${report.attachments.length}`, 11, false);
      addSpace();

      report.attachments.forEach((attachment, index) => {
        addText(`${index + 1}. ${attachment.originalName || attachment.filename}`, 10, false);

        if (attachment.descrizione) {
          addText(attachment.descrizione, 9, false, 15);
        }

        addText(`Caricato il: ${formatDate(attachment.uploadedAt.toISOString())}`, 9, false, 15);
        addSpace(2);
      });
    }

    // Footer
    doc.addPage();
    yPos = pageHeight / 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('_'.repeat(80), pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    doc.text(
      `Documento generato il ${format(new Date(), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 7;
    doc.text('Sistema Monitoraggio Olio di Roma', pageWidth / 2, yPos, { align: 'center' });

    // Genera il PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Nome file
    const filename = `Report_${report.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Errore generazione PDF:', error);
    return NextResponse.json(
      { error: 'Errore durante la generazione del PDF' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  IN_LAVORAZIONE: 'In Lavorazione',
  IN_VERIFICA: 'In Verifica',
  RICHIESTA_CHIARIMENTI: 'Richiesta Chiarimenti',
  SEGNALATO_AUTORITA: 'Segnalato ad Autorità',
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

    // Crea il PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Report - ${report.title}`,
        Author: 'Sistema Monitoraggio Olio',
        Subject: `Report ID: ${report.id}`,
        CreationDate: new Date()
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Header del documento
    doc.fontSize(20).font('Helvetica-Bold').text('REPORT COMPLETO', { align: 'center' });
    doc.moveDown();

    // Informazioni generali
    doc.fontSize(16).font('Helvetica-Bold').text('Informazioni Generali');
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica-Bold').text('Titolo: ', { continued: true });
    doc.font('Helvetica').text(report.title);

    doc.font('Helvetica-Bold').text('ID: ', { continued: true });
    doc.font('Helvetica').text(report.id);

    doc.font('Helvetica-Bold').text('Stato: ', { continued: true });
    doc.font('Helvetica').text(STATUS_LABELS[report.status] || report.status);

    doc.font('Helvetica-Bold').text('Data Creazione: ', { continued: true });
    doc.font('Helvetica').text(formatDate(report.createdAt.toISOString()));

    doc.font('Helvetica-Bold').text('Ultimo Aggiornamento: ', { continued: true });
    doc.font('Helvetica').text(formatDate(report.updatedAt.toISOString()));

    if (report.description) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Descrizione:');
      doc.font('Helvetica').text(report.description, { align: 'justify' });
    }

    doc.moveDown(1.5);

    // Timeline delle azioni
    if (report.actions.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Timeline Attività');
      doc.moveDown(0.5);

      report.actions.forEach((log, index) => {
        const actionLabel = ACTION_TYPE_LABELS[log.type] || log.type;

        doc.fontSize(11).font('Helvetica-Bold')
          .text(`${formatDate(log.createdAt.toISOString())} - ${actionLabel}`, { continued: false });

        doc.fontSize(10).font('Helvetica')
          .text(log.message, { indent: 20, align: 'justify' });

        if (index < report.actions.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(1.5);
    }

    // Sopralluoghi
    if (report.inspections.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Sopralluoghi');
      doc.moveDown(0.5);

      report.inspections.forEach((inspection, index) => {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`Sopralluogo #${index + 1}`, { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(11).font('Helvetica-Bold').text('Data: ', { continued: true });
        doc.font('Helvetica').text(formatDate(inspection.date.toISOString()));

        if (inspection.location) {
          doc.font('Helvetica-Bold').text('Località: ', { continued: true });
          doc.font('Helvetica').text(inspection.location);
        }

        if (inspection.minutesText) {
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').text('Verbale:');
          doc.font('Helvetica').text(inspection.minutesText, { align: 'justify' });
        }

        if (inspection.outcome) {
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').text('Esito: ', { continued: true });
          doc.font('Helvetica').text(inspection.outcome);
        }

        if (inspection.attachments && inspection.attachments.length > 0) {
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').text(`Allegati (${inspection.attachments.length}):`);
          inspection.attachments.forEach((att) => {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
              .text(`  - ${att.originalName || att.filename}`, { indent: 10 });
          });
          doc.fillColor('#000000').fontSize(11);
        }

        if (index < report.inspections.length - 1) {
          doc.moveDown(1);
          doc.strokeColor('#cccccc').lineWidth(0.5)
            .moveTo(doc.x, doc.y)
            .lineTo(doc.page.width - 100, doc.y)
            .stroke();
          doc.moveDown(1);
        }
      });

      doc.moveDown(1.5);
    }

    // Richieste di chiarimenti
    if (report.clarifications.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Richieste di Chiarimenti');
      doc.moveDown(0.5);

      report.clarifications.forEach((clarification, index) => {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`Richiesta #${index + 1}`, { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(11).font('Helvetica-Bold').text('Data Richiesta: ', { continued: true });
        doc.font('Helvetica').text(formatDate(clarification.requestedAt.toISOString()));

        if (clarification.dueAt) {
          doc.font('Helvetica-Bold').text('Scadenza: ', { continued: true });
          doc.font('Helvetica').text(formatDateOnly(clarification.dueAt.toISOString()));
        }

        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Domanda:');
        doc.font('Helvetica').text(clarification.question, { align: 'justify' });

        if (clarification.feedback) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').text('Risposta:');
          doc.font('Helvetica').text(clarification.feedback, { align: 'justify' });

          if (clarification.feedbackAt) {
            doc.fontSize(10).font('Helvetica').fillColor('#666666')
              .text(`Ricevuta il: ${formatDate(clarification.feedbackAt.toISOString())}`, { align: 'right' });
            doc.fillColor('#000000');
          }
        } else {
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999')
            .text('In attesa di risposta');
          doc.fillColor('#000000');
        }

        if (clarification.attachments && clarification.attachments.length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(11).font('Helvetica-Bold').text(`Allegati (${clarification.attachments.length}):`);
          clarification.attachments.forEach((att) => {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
              .text(`  - ${att.originalName || att.filename}`, { indent: 10 });
          });
          doc.fillColor('#000000').fontSize(11);
        }

        if (index < report.clarifications.length - 1) {
          doc.moveDown(1);
          doc.strokeColor('#cccccc').lineWidth(0.5)
            .moveTo(doc.x, doc.y)
            .lineTo(doc.page.width - 100, doc.y)
            .stroke();
          doc.moveDown(1);
        }
      });

      doc.moveDown(1.5);
    }

    // Segnalazioni a enti
    if (report.authorityNotices.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Segnalazioni ad Enti');
      doc.moveDown(0.5);

      report.authorityNotices.forEach((notice, index) => {
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`Segnalazione #${index + 1}`, { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(11).font('Helvetica-Bold').text('Ente: ', { continued: true });
        doc.font('Helvetica').text(notice.authority);

        doc.font('Helvetica-Bold').text('Data Invio: ', { continued: true });
        doc.font('Helvetica').text(formatDate(notice.sentAt.toISOString()));

        if (notice.protocol) {
          doc.font('Helvetica-Bold').text('Protocollo: ', { continued: true });
          doc.font('Helvetica').text(notice.protocol);
        }

        if (notice.feedback) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').text('Feedback Ricevuto:');
          doc.font('Helvetica').text(notice.feedback, { align: 'justify' });

          if (notice.feedbackAt) {
            doc.fontSize(10).font('Helvetica').fillColor('#666666')
              .text(`Ricevuto il: ${formatDate(notice.feedbackAt.toISOString())}`, { align: 'right' });
            doc.fillColor('#000000');
          }
        } else {
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999')
            .text('In attesa di feedback');
          doc.fillColor('#000000');
        }

        if (notice.attachments && notice.attachments.length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(11).font('Helvetica-Bold').text(`Allegati (${notice.attachments.length}):`);
          notice.attachments.forEach((att) => {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
              .text(`  - ${att.originalName || att.filename}`, { indent: 10 });
          });
          doc.fillColor('#000000').fontSize(11);
        }

        if (index < report.authorityNotices.length - 1) {
          doc.moveDown(1);
          doc.strokeColor('#cccccc').lineWidth(0.5)
            .moveTo(doc.x, doc.y)
            .lineTo(doc.page.width - 100, doc.y)
            .stroke();
          doc.moveDown(1);
        }
      });

      doc.moveDown(1.5);
    }

    // Allegati
    if (report.attachments.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Allegati');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica')
        .text(`Totale allegati: ${report.attachments.length}`);
      doc.moveDown(0.5);

      report.attachments.forEach((attachment, index) => {
        doc.fontSize(10).font('Helvetica-Bold')
          .text(`${index + 1}. `, { continued: true })
          .font('Helvetica')
          .text(attachment.originalName || attachment.filename);

        if (attachment.descrizione) {
          doc.fontSize(9).fillColor('#666666')
            .text(`   ${attachment.descrizione}`, { indent: 15 });
          doc.fillColor('#000000');
        }

        doc.fontSize(9).fillColor('#666666')
          .text(`   Caricato il: ${formatDate(attachment.uploadedAt.toISOString())}`, { indent: 15 });
        doc.fillColor('#000000');

        if (index < report.attachments.length - 1) {
          doc.moveDown(0.3);
        }
      });
    }

    // Footer
    doc.addPage();
    doc.moveDown(5);
    doc.fontSize(10).font('Helvetica').fillColor('#999999')
      .text('_'.repeat(80), { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Documento generato il ${format(new Date(), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}`, {
      align: 'center'
    });
    doc.text('Sistema Monitoraggio Olio di Roma', { align: 'center' });

    // Finalizza il PDF
    doc.end();

    // Aspetta che il PDF sia completato
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Ritorna il PDF come download
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

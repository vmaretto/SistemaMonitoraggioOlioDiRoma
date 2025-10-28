import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const reportId = params.id;
    const body = await request.json();

    const {
      titoloVerbale,
      dataOra,
      luogo,
      partecipanti,
      oggetto,
      contenuto,
      conclusioni,
      firmatario
    } = body;

    // Verifica che il report esista
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        title: true,
        status: true
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report non trovato' }, { status: 404 });
    }

    // Crea il PDF del verbale
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Helper functions
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, indent: number = 0, align: 'left' | 'center' | 'right' = 'left') => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');

      const effectiveWidth = maxWidth - indent;
      const lines = doc.splitTextToSize(text, effectiveWidth);

      lines.forEach((line: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        let xPos = margin + indent;
        if (align === 'center') {
          xPos = pageWidth / 2;
        } else if (align === 'right') {
          xPos = pageWidth - margin;
        }

        doc.text(line, xPos, yPos, { align: align });
        yPos += fontSize * 0.5;
      });
    };

    const addSpace = (size: number = 5) => {
      yPos += size;
    };

    const addLine = () => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
    };

    // INTESTAZIONE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    addText('VERBALE', 18, true, 0, 'center');
    addSpace(5);
    addLine();
    addSpace(10);

    // Titolo verbale
    if (titoloVerbale) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      addText(titoloVerbale, 14, true, 0, 'center');
      addSpace(10);
    }

    // Riferimento report
    addText(`Report di riferimento: ${report.title}`, 10, false, 0, 'left');
    addText(`ID Report: ${report.id}`, 9, false, 0, 'left');
    addSpace(10);

    // DATA E LUOGO
    if (dataOra) {
      const dataFormattata = format(new Date(dataOra), "dd MMMM yyyy 'alle ore' HH:mm", { locale: it });
      addText(`Data e ora: ${dataFormattata}`, 11, true);
    }

    if (luogo) {
      addText(`Luogo: ${luogo}`, 11, true);
    }
    addSpace(10);

    // PARTECIPANTI
    if (partecipanti && partecipanti.length > 0) {
      addText('PARTECIPANTI', 12, true);
      addSpace(3);
      partecipanti.forEach((p: string) => {
        addText(`• ${p}`, 10, false, 5);
      });
      addSpace(10);
    }

    // OGGETTO
    if (oggetto) {
      addText('OGGETTO', 12, true);
      addSpace(3);
      addText(oggetto, 10, false);
      addSpace(10);
    }

    // CONTENUTO/VERBALE
    if (contenuto) {
      addText('VERBALE', 12, true);
      addSpace(3);
      addText(contenuto, 10, false);
      addSpace(10);
    }

    // CONCLUSIONI
    if (conclusioni) {
      addText('CONCLUSIONI', 12, true);
      addSpace(3);
      addText(conclusioni, 10, false);
      addSpace(15);
    }

    // FIRMA
    addSpace(20);
    addLine();
    addSpace(10);

    if (firmatario) {
      addText(`Il verbalizzante: ${firmatario}`, 10, false, 0, 'left');
    }

    const dataGenerazione = format(new Date(), "dd MMMM yyyy 'alle ore' HH:mm", { locale: it });
    addText(`Documento generato il: ${dataGenerazione}`, 9, false, 0, 'left');
    doc.setTextColor(100, 100, 100);
    addText('Sistema Monitoraggio Olio di Roma', 8, false, 0, 'left');

    // Footer su tutte le pagine
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${i} di ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Genera il PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Nome file
    const titoloFile = (titoloVerbale || 'Verbale').replace(/[^a-z0-9]/gi, '_');
    const filename = `Verbale_${titoloFile}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Errore generazione verbale PDF:', error);
    return NextResponse.json(
      { error: 'Errore durante la generazione del verbale PDF' },
      { status: 500 }
    );
  }
}

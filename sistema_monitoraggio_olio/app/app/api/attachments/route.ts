import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

// Schema di validazione per la creazione di allegati
const createAttachmentSchema = z.object({
  reportId: z.string().min(1, 'ID report obbligatorio'),
  entityType: z.enum(['REPORT', 'INSPECTION', 'CLARIFICATION', 'AUTHORITY_NOTICE']),
  entityId: z.string().min(1, 'ID entità obbligatorio'),
  filename: z.string().min(1, 'Nome file obbligatorio'),
  url: z.string().url('URL non valido')
});

// GET /api/attachments - Lista allegati con filtri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // Costruisci filtri
    const where: any = {};
    if (reportId) where.reportId = reportId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const attachments = await prisma.attachment.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        report: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      attachments
    });

  } catch (error) {
    console.error('Errore recupero allegati:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/attachments - Crea nuovo allegato
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createAttachmentSchema.parse(body);

    // Verifica che il report esista
    const report = await prisma.report.findUnique({
      where: { id: validatedData.reportId },
      select: { id: true, title: true, status: true }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report non trovato' },
        { status: 404 }
      );
    }

    // Validazioni specifiche per entityType
    const entityValidations = {
      REPORT: async (entityId: string) => {
        const exists = await prisma.report.findUnique({
          where: { id: entityId }
        });
        return !!exists;
      },
      INSPECTION: async (entityId: string) => {
        const exists = await prisma.inspection.findUnique({
          where: { id: entityId }
        });
        return !!exists;
      },
      CLARIFICATION: async (entityId: string) => {
        const exists = await prisma.clarificationRequest.findUnique({
          where: { id: entityId }
        });
        return !!exists;
      },
      AUTHORITY_NOTICE: async (entityId: string) => {
        const exists = await prisma.authorityNotice.findUnique({
          where: { id: entityId }
        });
        return !!exists;
      }
    };

    // Verifica che l'entità specificata esista
    const entityExists = await entityValidations[validatedData.entityType](validatedData.entityId);
    if (!entityExists) {
      return NextResponse.json(
        { error: `Entità ${validatedData.entityType} con ID ${validatedData.entityId} non trovata` },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Crea l'allegato
      const attachment = await tx.attachment.create({
        data: {
          reportId: validatedData.reportId,
          entityType: validatedData.entityType,
          entityId: validatedData.entityId,
          filename: validatedData.filename,
          url: validatedData.url,
          uploadedBy: session.user.id
        }
      });

      // Crea ActionLog
      const entityTypeTranslations = {
        REPORT: 'report',
        INSPECTION: 'sopralluogo',
        CLARIFICATION: 'richiesta chiarimenti',
        AUTHORITY_NOTICE: 'segnalazione ente'
      };

      await tx.actionLog.create({
        data: {
          reportId: validatedData.reportId,
          type: 'ALLEGATO_AGGIUNTO',
          message: `Allegato "${validatedData.filename}" aggiunto a ${entityTypeTranslations[validatedData.entityType]}`,
          actorId: session.user.id,
          meta: {
            attachmentId: attachment.id,
            entityType: validatedData.entityType,
            entityId: validatedData.entityId,
            filename: validatedData.filename,
            url: validatedData.url
          }
        }
      });

      return attachment;
    });

    return NextResponse.json({
      attachment: result,
      message: 'Allegato caricato con successo'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore creazione allegato:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments - Elimina allegato (richiede ID nell'URL)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'ID allegato mancante' },
        { status: 400 }
      );
    }

    // Verifica che l'allegato esista
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        report: {
          select: { id: true, title: true }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Allegato non trovato' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Elimina l'allegato
      await tx.attachment.delete({
        where: { id: attachmentId }
      });

      // Crea ActionLog
      await tx.actionLog.create({
        data: {
          reportId: attachment.reportId,
          type: 'ALLEGATO_RIMOSSO',
          message: `Allegato "${attachment.filename}" rimosso`,
          actorId: session.user.id,
          meta: {
            attachmentId: attachmentId,
            entityType: attachment.entityType,
            entityId: attachment.entityId,
            filename: attachment.filename,
            url: attachment.url,
            originalUploadedBy: attachment.uploadedBy,
            originalUploadedAt: attachment.uploadedAt
          }
        }
      });

      return attachment;
    });

    return NextResponse.json({
      message: `Allegato "${result.filename}" eliminato con successo`
    });

  } catch (error) {
    console.error('Errore eliminazione allegato:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
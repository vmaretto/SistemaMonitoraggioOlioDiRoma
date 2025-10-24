import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile, deleteFile, validateFile } from '@/lib/storage-service';
import { z } from 'zod';
import type { AttachmentType } from '@prisma/client';

// Schema di validazione per aggiornamento metadata
const updateAttachmentSchema = z.object({
  id: z.string(),
  tipo: z.enum([
    'GENERICO',
    'FOTOGRAFIA',
    'CERTIFICATO',
    'ANALISI_LABORATORIO',
    'DOCUMENTO_UFFICIALE',
    'COMUNICAZIONE',
    'FATTURA',
    'CONTRATTO',
    'ETICHETTA',
    'SCREENSHOT',
    'REPORT_PDF',
    'ALTRO'
  ]).optional(),
  descrizione: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// GET /api/attachments - Lista allegati con filtri
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const inspectionId = searchParams.get('inspectionId');
    const clarificationId = searchParams.get('clarificationId');
    const authorityNoticeId = searchParams.get('authorityNoticeId');
    const stateChangeId = searchParams.get('stateChangeId');
    const context = searchParams.get('context');

    // Costruisci filtri
    const where: any = {};
    if (reportId) where.reportId = reportId;
    if (inspectionId) where.inspectionId = inspectionId;
    if (clarificationId) where.clarificationId = clarificationId;
    if (authorityNoticeId) where.authorityNoticeId = authorityNoticeId;
    if (stateChangeId) where.stateChangeId = stateChangeId;
    if (context) where.entityType = context.toUpperCase();

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
        },
        inspection: {
          select: {
            id: true,
            tipo: true,
            stato: true
          }
        },
        clarification: {
          select: {
            id: true,
            oggetto: true,
            stato: true
          }
        },
        authorityNotice: {
          select: {
            id: true,
            oggetto: true,
            stato: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: attachments
    });

  } catch (error) {
    console.error('Errore recupero allegati:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/attachments - Upload file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    // Estrai parametri
    const files = formData.getAll('files') as File[];
    const context = formData.get('context') as string || 'report';
    const reportId = formData.get('reportId') as string | null;
    const inspectionId = formData.get('inspectionId') as string | null;
    const clarificationId = formData.get('clarificationId') as string | null;
    const authorityNoticeId = formData.get('authorityNoticeId') as string | null;
    const stateChangeId = formData.get('stateChangeId') as string | null;
    const tipo = formData.get('tipo') as AttachmentType || 'GENERICO';
    const descrizione = formData.get('descrizione') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const tags = tagsStr ? JSON.parse(tagsStr) : [];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    // Configurazione limiti per contesto
    const limits: Record<string, { maxSizeMB: number; allowedTypes: string[] }> = {
      report: {
        maxSizeMB: 10,
        allowedTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      },
      inspection: {
        maxSizeMB: 20,
        allowedTypes: ['image/*', 'application/pdf']
      },
      clarification: {
        maxSizeMB: 15,
        allowedTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      },
      authority_notice: {
        maxSizeMB: 25,
        allowedTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      },
      etichetta: {
        maxSizeMB: 5,
        allowedTypes: ['image/*']
      },
    };

    const limit = limits[context] || limits.report;

    // Valida e carica i file
    const uploadedAttachments = [];
    const errors = [];

    for (const file of files) {
      // Valida file
      const validation = validateFile(
        { name: file.name, size: file.size, type: file.type },
        { maxSizeMB: limit.maxSizeMB, allowedMimeTypes: limit.allowedTypes }
      );

      if (!validation.valid) {
        errors.push({ filename: file.name, errors: validation.errors });
        continue;
      }

      try {
        // Converti file a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload file
        const uploadResult = await uploadFile({
          buffer,
          originalName: file.name,
          mimeType: file.type,
          context,
          entityId: reportId || inspectionId || clarificationId || authorityNoticeId || stateChangeId || undefined
        });

        // Crea record in database
        const attachment = await prisma.attachment.create({
          data: {
            filename: uploadResult.filename,
            originalName: uploadResult.originalName,
            mimeType: uploadResult.mimeType,
            size: uploadResult.size,
            url: uploadResult.url,
            storagePath: uploadResult.storagePath,
            tipo,
            descrizione,
            tags,
            reportId,
            inspectionId,
            clarificationId,
            authorityNoticeId,
            stateChangeId,
            uploadedBy: session.user.id,
            // Campi legacy per compatibilità
            entityType: context.toUpperCase(),
            entityId: reportId || inspectionId || clarificationId || authorityNoticeId || stateChangeId || undefined
          }
        });

        uploadedAttachments.push(attachment);

        // Crea ActionLog se è associato a un report
        if (reportId) {
          await prisma.actionLog.create({
            data: {
              reportId,
              type: 'ALLEGATO_AGGIUNTO',
              message: `Allegato "${file.name}" caricato`,
              actorId: session.user.id,
              meta: {
                attachmentId: attachment.id,
                context,
                filename: file.name,
                size: file.size,
                tipo
              }
            }
          });
        }

      } catch (uploadError) {
        console.error(`Errore upload file ${file.name}:`, uploadError);
        errors.push({ filename: file.name, errors: ['Errore durante l\'upload'] });
      }
    }

    if (uploadedAttachments.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Nessun file caricato con successo', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: uploadedAttachments,
      message: `${uploadedAttachments.length} file caricati con successo`,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 });

  } catch (error) {
    console.error('Errore upload allegati:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PATCH /api/attachments - Aggiorna metadata allegato
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateAttachmentSchema.parse(body);

    // Verifica che l'allegato esista
    const attachment = await prisma.attachment.findUnique({
      where: { id: validatedData.id }
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Allegato non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna metadata
    const updated = await prisma.attachment.update({
      where: { id: validatedData.id },
      data: {
        tipo: validatedData.tipo,
        descrizione: validatedData.descrizione,
        tags: validatedData.tags
      }
    });

    // Crea ActionLog se è associato a un report
    if (attachment.reportId) {
      await prisma.actionLog.create({
        data: {
          reportId: attachment.reportId,
          type: 'ALLEGATO_MODIFICATO',
          message: `Metadata allegato "${attachment.originalName}" aggiornati`,
          actorId: session.user.id,
          meta: {
            attachmentId: attachment.id,
            changes: validatedData
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Allegato aggiornato con successo'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Errore aggiornamento allegato:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments - Elimina allegato
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: 'ID allegato mancante' },
        { status: 400 }
      );
    }

    // Verifica che l'allegato esista
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Allegato non trovato' },
        { status: 404 }
      );
    }

    // Elimina file da storage
    try {
      await deleteFile({ storagePath: attachment.storagePath });
    } catch (storageError) {
      console.error('Errore eliminazione file da storage:', storageError);
      // Continua comunque con l'eliminazione del record
    }

    // Elimina record dal database
    await prisma.attachment.delete({
      where: { id: attachmentId }
    });

    // Crea ActionLog se è associato a un report
    if (attachment.reportId) {
      await prisma.actionLog.create({
        data: {
          reportId: attachment.reportId,
          type: 'ALLEGATO_RIMOSSO',
          message: `Allegato "${attachment.originalName}" eliminato`,
          actorId: session.user.id,
          meta: {
            attachmentId: attachmentId,
            filename: attachment.originalName,
            size: attachment.size,
            tipo: attachment.tipo
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Allegato "${attachment.originalName}" eliminato con successo`
    });

  } catch (error) {
    console.error('Errore eliminazione allegato:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * Storage Service per la gestione degli allegati
 * Supporta sia storage locale che S3/compatibili (MinIO, Cloudflare R2)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Configurazione storage
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';

// Configurazione S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // Necessario per MinIO e alcuni provider S3-compatibili
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

export interface UploadFileOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  context?: string; // report, inspection, clarification, authority_notice
  entityId?: string;
}

export interface UploadFileResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storagePath: string;
}

export interface DeleteFileOptions {
  storagePath: string;
}

/**
 * Genera un nome file univoco mantenendo l'estensione originale
 */
function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  const uniqueId = randomUUID();
  return `${sanitizedName}_${uniqueId}${ext}`;
}

/**
 * Costruisce il percorso di storage basato sul contesto
 */
function buildStoragePath(context: string, entityId: string | undefined, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (entityId) {
    return `${context}/${year}/${month}/${entityId}/${filename}`;
  }
  return `${context}/${year}/${month}/${filename}`;
}

/**
 * Upload file su storage locale
 */
async function uploadToLocalStorage(options: UploadFileOptions): Promise<UploadFileResult> {
  const { buffer, originalName, mimeType, context = 'general', entityId } = options;

  const filename = generateUniqueFilename(originalName);
  const storagePath = buildStoragePath(context, entityId, filename);
  const fullPath = path.join(LOCAL_STORAGE_PATH, storagePath);

  // Crea directory se non esiste
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  // Salva file
  await fs.writeFile(fullPath, buffer);

  // URL pubblico (assumendo che /uploads sia servito staticamente)
  const url = `/uploads/${storagePath}`;

  return {
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    url,
    storagePath,
  };
}

/**
 * Upload file su S3
 */
async function uploadToS3(options: UploadFileOptions): Promise<UploadFileResult> {
  const { buffer, originalName, mimeType, context = 'general', entityId } = options;

  const filename = generateUniqueFilename(originalName);
  const storagePath = buildStoragePath(context, entityId, filename);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: storagePath,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      originalName,
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // Genera URL firmato valido per 7 giorni
  const getCommand = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: storagePath,
  });

  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 7 * 24 * 60 * 60 });

  return {
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    url,
    storagePath,
  };
}

/**
 * Upload file (routing automatico locale/S3)
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  if (USE_LOCAL_STORAGE) {
    return uploadToLocalStorage(options);
  } else {
    return uploadToS3(options);
  }
}

/**
 * Upload multipli
 */
export async function uploadFiles(filesOptions: UploadFileOptions[]): Promise<UploadFileResult[]> {
  return Promise.all(filesOptions.map(options => uploadFile(options)));
}

/**
 * Elimina file da storage locale
 */
async function deleteFromLocalStorage(options: DeleteFileOptions): Promise<void> {
  const { storagePath } = options;
  const fullPath = path.join(LOCAL_STORAGE_PATH, storagePath);

  try {
    await fs.unlink(fullPath);

    // Tenta di eliminare directory vuote
    const dir = path.dirname(fullPath);
    try {
      await fs.rmdir(dir);
    } catch {
      // Directory non vuota, ignora
    }
  } catch (error) {
    console.error(`Errore eliminazione file locale ${storagePath}:`, error);
    throw error;
  }
}

/**
 * Elimina file da S3
 */
async function deleteFromS3(options: DeleteFileOptions): Promise<void> {
  const { storagePath } = options;

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: storagePath,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error(`Errore eliminazione file S3 ${storagePath}:`, error);
    throw error;
  }
}

/**
 * Elimina file (routing automatico locale/S3)
 */
export async function deleteFile(options: DeleteFileOptions): Promise<void> {
  if (USE_LOCAL_STORAGE) {
    return deleteFromLocalStorage(options);
  } else {
    return deleteFromS3(options);
  }
}

/**
 * Genera URL firmato temporaneo per file S3
 * (per storage locale ritorna l'URL pubblico statico)
 */
export async function getSignedFileUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
  if (USE_LOCAL_STORAGE) {
    return `/uploads/${storagePath}`;
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: storagePath,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Valida tipo MIME
 */
export function isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
  // Supporta wildcard (es: image/*)
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === allowed;
  });
}

/**
 * Valida dimensione file
 */
export function isValidFileSize(size: number, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

/**
 * Estrae estensione da nome file
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Validazione file completa
 */
export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFile(
  file: { name: string; size: number; type: string },
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSizeMB = 10,
    allowedMimeTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
  } = options;

  const errors: string[] = [];

  // Valida dimensione
  if (!isValidFileSize(file.size, maxSizeMB)) {
    errors.push(`Il file supera la dimensione massima di ${maxSizeMB}MB`);
  }

  // Valida MIME type
  if (!isValidMimeType(file.type, allowedMimeTypes)) {
    errors.push(`Tipo di file non supportato: ${file.type}`);
  }

  // Valida estensione
  const ext = getFileExtension(file.name);
  if (!allowedExtensions.includes(ext)) {
    errors.push(`Estensione file non supportata: ${ext}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

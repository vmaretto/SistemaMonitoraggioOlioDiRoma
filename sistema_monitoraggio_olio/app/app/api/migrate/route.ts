import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test della connessione al database
    await prisma.$connect();
    
    // Esegue un comando SQL semplice per verificare
    const result = await prisma.$executeRaw`SELECT 1`;
    
    // Chiude la connessione
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful! Prisma is already configured.',
      result,
      info: 'Le tabelle vengono create automaticamente da Prisma durante il build di Vercel.'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint - verifica configurazione di rete
 * Non richiede database
 */
export async function GET(request: NextRequest) {
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: {
      url: process.env.NEXTAUTH_URL || 'not configured',
      port: process.env.PORT || '3000 (default)',
      host: process.env.HOST || 'localhost (default)',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    providers: {
      serpapi: {
        configured: !!process.env.SERPAPI_KEY,
        mockMode: process.env.SERPAPI_MOCK_MODE === 'true',
        baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com/search.json',
      },
      webzio: {
        configured: !!process.env.WEBZIO_TOKEN,
        mockMode: process.env.WEBZIO_MOCK_MODE === 'true',
        baseUrl: process.env.WEBZIO_BASE_URL || 'https://api.webz.io/filterWebContent',
      },
      awario: {
        configured: !!process.env.AWARIO_API_KEY,
        mockMode: process.env.AWARIO_MOCK_MODE === 'true',
        baseUrl: process.env.AWARIO_BASE_URL || 'https://api.awario.com/v1',
      },
    },
    database: {
      configured: !!process.env.DATABASE_URL,
      url: process.env.DATABASE_URL ? '[REDACTED]' : 'not configured',
    },
  };

  return NextResponse.json(response, { status: 200 });
}

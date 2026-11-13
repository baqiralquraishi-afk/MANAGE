import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'humanity-web',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      checks: {
        web: 'ok',
        runtime: 'node',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}

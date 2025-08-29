import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/utils/api-helpers';
import packageJson from '../../../../package.json';

export async function GET() {
  const version = packageJson.version || '1.0.0';
  const timestamp = new Date().toISOString();

  return createSuccessResponse(
    {
      status: 'healthy',
      version,
      ts: timestamp,
    },
    200
  );
}

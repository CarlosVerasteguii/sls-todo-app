import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

type SuccessData<T> = T;

type ErrorData = {
  code: string;
  message: string;
};

export function createSuccessResponse<T>(data: SuccessData<T>, status: number = 200) {
  const request_id = randomUUID();
  return NextResponse.json(
    {
      ok: true,
      data,
      request_id,
    },
    { status }
  );
}

export function createErrorResponse(error: ErrorData, status: number) {
  const request_id = randomUUID();
  return NextResponse.json(
    {
      ok: false,
      error,
      request_id,
    },
    { status }
  );
}

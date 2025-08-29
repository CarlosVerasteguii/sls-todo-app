import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-helpers';
import { z } from 'zod';
import { Todo } from '@/types/task';

// Zod schema for POST request body
const todoCreateSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  project: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('identifier');

  if (!identifier) {
    return createErrorResponse(
      { code: 'BAD_REQUEST', message: 'Identifier query parameter is required' },
      400
    );
  }

  const identifier_norm = identifier.trim().toLowerCase();

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('identifier_norm', identifier_norm)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching todos:', error);
    return createErrorResponse(
      { code: 'DB_ERROR', message: error.message },
      500
    );
  }

  return createSuccessResponse<Todo[]>(data || [], 200);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const body = await request.json();
    const validatedData = todoCreateSchema.parse(body);

    const { identifier, title, description, project, tags, priority } = validatedData;

    const identifier_norm = identifier.trim().toLowerCase();

    const { data, error } = await supabase
      .from('todos')
      .insert({
        identifier_raw: identifier,
        identifier_norm: identifier_norm,
        title: title,
        description: description,
        project: project,
        tags: tags, // Persist tags directly as array
        priority: priority,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting todo:', error);
      return createErrorResponse(
        { code: 'DB_ERROR', message: error.message },
        500
      );
    }

    return createSuccessResponse<Todo>(data, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        400
      );
    }
    console.error('Unexpected error in POST /api/todos:', error);
    return createErrorResponse(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}

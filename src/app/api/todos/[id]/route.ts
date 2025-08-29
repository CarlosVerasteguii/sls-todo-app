import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-helpers';
import { z } from 'zod';
import { Todo } from '@/types/task';

// Zod schema for PATCH request body
const todoUpdateSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional().nullable(),
  project: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { id } = params;

  try {
    const body = await request.json();
    const validatedData = todoUpdateSchema.parse(body);

    if (Object.keys(validatedData).length === 0) {
      return createErrorResponse(
        { code: 'BAD_REQUEST', message: 'Request body cannot be empty' },
        400
      );
    }

    const updatePayload: { [key: string]: any } = {};
    for (const key in validatedData) {
      if (validatedData.hasOwnProperty(key)) {
        if (key === 'tags' && validatedData.tags !== undefined) {
          updatePayload.tags = validatedData.tags; // Persist tags directly as array
        } else {
          updatePayload[key] = (validatedData as any)[key];
        }
      }
    }

    const { data, error } = await supabase
      .from('todos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error);
      if (error.code === 'PGRST116') { // No rows found
        return createErrorResponse({ code: 'NOT_FOUND', message: 'Todo not found' }, 404);
      }
      return createErrorResponse(
        { code: 'DB_ERROR', message: error.message },
        500
      );
    }

    return createSuccessResponse<Todo>(data, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        400
      );
    }
    console.error('Unexpected error in PATCH /api/todos/:id:', error);
    return createErrorResponse(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Error deleting todo:', error);
    return createErrorResponse(
      { code: 'DB_ERROR', message: error.message },
      500
    );
  }

  if (!data || data.length === 0) {
    return createErrorResponse({ code: 'NOT_FOUND', message: 'Todo not found' }, 404);
  }

  return createSuccessResponse({ id: data[0].id }, 200);
}

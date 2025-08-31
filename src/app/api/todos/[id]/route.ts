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
  context: { params: { id: string } }
) {
  const supabase = await createClient();
  const params = await context.params;
  const id = params.id;

  try {
    const body = await request.json();
    const { identifier, ...updatePayload } = body; // Extraer identifier y el resto de los datos

    if (!identifier) {
      return createErrorResponse({ code: 'BAD_REQUEST', message: 'Identifier is required in the request body' }, 400);
    }
    const identifier_norm = (identifier as string).trim().toLowerCase();

    const validatedData = todoUpdateSchema.parse(updatePayload);

    if (Object.keys(validatedData).length === 0) {
      return createErrorResponse(
        { code: 'BAD_REQUEST', message: 'Request body cannot be empty' },
        400
      );
    }

    const { data, error } = await supabase
      .from('todos')
      .update(validatedData)
      .eq('id', id)
      .eq('identifier_norm', identifier_norm) // <-- CLÁUSULA DE SEGURIDAD
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error);
      if (error.code === 'PGRST116') { // No rows found
        return createErrorResponse({ code: 'NOT_FOUND', message: 'Task not found or permission denied' }, 404);
      }
      return createErrorResponse(
        { code: 'DB_ERROR', message: error.message },
        500
      );
    }

    if (!data && !error) {
      return createErrorResponse({ code: 'NOT_FOUND', message: 'Task not found or permission denied' }, 404);
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
  context: { params: { id: string } }
) {
  console.log('\n--- [API] Petición DELETE recibida ---');
  const supabase = await createClient();
  const params = await context.params;
  const id = params.id;
  console.log('[API] ID de la ruta:', id);

  try {
    const body = await request.json();
    console.log('[API] Body recibido:', body);
    const { identifier } = body;
    console.log('[API] Identifier extraído:', identifier);

    if (!identifier) {
      console.error('[API] ERROR: Identifier no encontrado en el body. Abortando.');
      return createErrorResponse({ code: 'BAD_REQUEST', message: 'Identifier is required in the request body' }, 400);
    }
    const identifier_norm = (identifier as string).trim().toLowerCase();
    console.log('[API] Identifier normalizado para la consulta:', identifier_norm);

    const { data, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('identifier_norm', identifier_norm) // <-- CLÁUSULA DE SEGURIDAD
      .select('id')
      .single();

    console.log('[API] Resultado de Supabase (data):', data);
    console.log('[API] Resultado de Supabase (error):', error);
    console.log('--- [API] Fin de la petición ---');

    if (error) {
      console.error('Error deleting todo:', error);
      // Si el error es 'PGRST116', significa "No rows found". Lo tratamos como 404.
      if ((error as any).code === 'PGRST116') {
        return createErrorResponse({ code: 'NOT_FOUND', message: 'Task not found or permission denied' }, 404);
      }
      return createErrorResponse(
        { code: 'DB_ERROR', message: error.message },
        500
      );
    }

    // El bloque 'if (!data && !error)' puede que nunca se alcance con .single(),
    // pero lo dejamos como una segunda capa de seguridad.
    if (!data && !error) {
      return createErrorResponse({ code: 'NOT_FOUND', message: 'Task not found or permission denied' }, 404);
    }

    return createSuccessResponse({ id: data.id }, 200);
  } catch (error) {
    console.error('Unexpected error in DELETE /api/todos/:id:', error);
    return createErrorResponse(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      500
    );
  }
}

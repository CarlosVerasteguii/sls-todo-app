import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Asumiendo que usas el cliente de servidor
import { createHmac } from 'crypto';

// Helper para verificar la firma HMAC
async function verifySignature(request: NextRequest): Promise<{ body: any; isValid: boolean }> {
  const signature = request.headers.get('x-workflow-signature');
  const secret = process.env.WORKFLOW_SIGNING_SECRET;

  if (!secret) {
    // Si no hay secreto, asumimos que la validación no es necesaria
    console.warn('WORKFLOW_SIGNING_SECRET is not set. Skipping HMAC verification.');
    const body = await request.json();
    return { body, isValid: true };
  }
  
  if (!signature) {
    return { body: null, isValid: false };
  }

  const rawBody = await request.text();
  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex');
  
  if (signature !== expectedSignature) {
    return { body: null, isValid: false };
  }
  
  return { body: JSON.parse(rawBody), isValid: true };
}

export async function POST(request: NextRequest) {
  const { body, isValid } = await verifySignature(request);

  if (!isValid) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  // Validar el payload recibido
  const { todo_id, enhanced_description, steps } = body;

  if (!todo_id || (!enhanced_description && !steps)) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('todos')
    .update({
      enhanced_description: enhanced_description,
      steps: steps,
    })
    .eq('id', todo_id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    // Si la tarea no se encuentra (quizás fue borrada), devolvemos 404
    if ((error as any).code === 'PGRST116') {
      return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to update task' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

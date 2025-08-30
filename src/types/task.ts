export type Todo = {
  id: string;
  identifier_raw: string;
  identifier_norm: string;
  title: string;
  description: string | null;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  project: string | null;
  tags: string[]; // tags: not null, default []
  completed: boolean;
  enhanced_description: string | null; // text
  steps: unknown[] | null; // jsonb
  created_at: string;
  updated_at: string;
};

// --- ADD start ---
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

// Si hoy exportamos `Todo`, crea alias para no romper imports que esperan `Task`
export type Task = Todo & {
  // UI/derived fields (not persisted 1:1)
  status?: "active" | "snoozed" | "completed";
  completedAt?: string | null;
  dueAt?: string | null;
  snoozedUntil?: string | null;
  userIdentifier?: string;
  updatedAt?: string; // alias for updated_at used in UI helpers
};

export type TaskFilters = {
  status?: string[];
  priority?: Priority[];
  tags?: string[];
  project?: string;
  search?: string;
  showOverdue?: boolean;
  showToday?: boolean;
};

// Unión mínima para el sistema de undo (ajusta solo si ya existe una igual)
export type UndoAction =
  | { type: 'create'; taskId: string; timestamp: number }
  | { type: 'update'; taskId: string; previousState: Task; timestamp: number }
  | { type: 'delete'; taskId: string; previousState: Task; timestamp: number }
  | { type: 'toggle'; taskId: string; previousState: Task; timestamp: number }
  | { type: 'bulk_delete'; taskIds: string[]; previousState: Task[]; timestamp: number }
  | { type: 'bulk'; taskIds: string[]; previousState: Task[]; timestamp: number };
// --- ADD end ---
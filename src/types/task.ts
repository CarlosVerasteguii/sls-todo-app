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
export type MemoryKind = 'learning' | 'history';

export interface MemoryQuery {
  text?: string;
  kind?: MemoryKind;
  scopes?: string[];
  limit?: number;
}

export interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  tags: string[];
  scope?: string;
  importance?: number;
  taskId?: string | null;
  createdAt: string;
  score?: number;
}

export type MemoryMutation = 
  | { op: 'upsert'; kind: MemoryKind; id?: string; content: string; tags?: string[]; importance?: number; scope?: string; taskId?: string }
  | { op: 'update'; kind: MemoryKind; id: string; content?: string; tags?: string[]; importance?: number; scope?: string; taskId?: string }
  | { op: 'delete'; kind: MemoryKind; id: string };

export interface MutationResult {
  id: string;
  status: string; // 'created' | 'updated' | 'deleted' | 'not_found'
  project: string;
}

Type: grilling
Status: resolved

## Question

What is the updated SQLite and PostgreSQL database schema to support importance ranking (1-5), team mode scopes (`people`, `project`, `global`), and query tracking? How should the codebase abstract the SQLite/Postgres adapter interface?

## Answer

### 1. Database Schema Specifications

#### 1.1 `learnings` Table
Stores agent learnings, updated to include importance rankings and dynamic team scopes (such as specific project names and usernames).

**SQLite Schema:**
```sql
CREATE TABLE IF NOT EXISTS learnings (
  id         TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  content    TEXT NOT NULL,
  tags       TEXT NOT NULL DEFAULT '[]',
  embedding  BLOB NOT NULL,
  scope      TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
CREATE INDEX IF NOT EXISTS idx_learnings_scope ON learnings (scope);
CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);
```

**PostgreSQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS learnings (
  id         UUID PRIMARY KEY NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  content    TEXT NOT NULL,
  tags       JSONB NOT NULL DEFAULT '[]',
  embedding  vector(384) NOT NULL,
  scope      VARCHAR(255) NOT NULL,
  importance SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
CREATE INDEX IF NOT EXISTS idx_learnings_scope ON learnings (scope);
CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);
```

---

#### 1.2 `history` Table
Stores semantic action history logs, updated to support importance ranking and scopes (e.g. scoping history to global, specific project names, or specific users).

**SQLite Schema:**
```sql
CREATE TABLE IF NOT EXISTS history (
  id         TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  task_id    TEXT,
  content    TEXT NOT NULL,
  tags       TEXT NOT NULL DEFAULT '[]',
  embedding  BLOB NOT NULL,
  scope      TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
CREATE INDEX IF NOT EXISTS idx_history_scope ON history (scope);
CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_task ON history (task_id) WHERE task_id IS NOT NULL;
```

**PostgreSQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS history (
  id         UUID PRIMARY KEY NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  task_id    VARCHAR(255),
  content    TEXT NOT NULL,
  tags       JSONB NOT NULL DEFAULT '[]',
  embedding  vector(384) NOT NULL,
  scope      VARCHAR(255) NOT NULL,
  importance SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
CREATE INDEX IF NOT EXISTS idx_history_scope ON history (scope);
CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_task ON history (task_id) WHERE task_id IS NOT NULL;
```

---

#### 1.3 `query_logs` Table
Tracks user/agent queries, supporting semantic grouping for auto-promotion evaluation.

**SQLite Schema:**
```sql
CREATE TABLE IF NOT EXISTS query_logs (
  id          TEXT PRIMARY KEY NOT NULL,
  project_id  TEXT NOT NULL,
  query_text  TEXT NOT NULL,
  embedding   BLOB NOT NULL,
  scope       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_query_logs_project_created ON query_logs (project_id, created_at DESC);
```

**PostgreSQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS query_logs (
  id          UUID PRIMARY KEY NOT NULL,
  project_id  VARCHAR(64) NOT NULL,
  query_text  TEXT NOT NULL,
  embedding   vector(384) NOT NULL,
  scope       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_query_logs_project_created ON query_logs (project_id, created_at DESC);
```

---

#### 1.4 `meta` Table
Holds local settings. In PostgreSQL, this can be partitioned or scoped per-project.

**SQLite Schema:**
```sql
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

**PostgreSQL Schema:**
```sql
CREATE TABLE IF NOT EXISTS meta (
  project_id VARCHAR(64) NOT NULL,
  key        VARCHAR(255) NOT NULL,
  value      TEXT NOT NULL,
  PRIMARY KEY (project_id, key)
);
```

---

### 2. Database Adapter Interface (`DatabaseAdapter`)

```typescript
export interface ProjectMetadata {
  projectName: string;
  projectRoot: string;
}

export interface LearningRecord {
  id: string;
  projectId: string;
  content: string;
  tags: string[];
  embedding: Float32Array;
  scope: string;       // 'global', <project-name>, or <username>
  importance: number;  // 1-5
  createdAt: string;
}

export interface HistoryRecord {
  id: string;
  projectId: string;
  taskId: string | null;
  content: string;
  tags: string[];
  embedding: Float32Array;
  scope: string;       // 'global', <project-name>, or <username>
  importance: number;  // 1-5
  createdAt: string;
}

export interface QueryLogRecord {
  id: string;
  projectId: string;
  queryText: string;
  embedding: Float32Array;
  scope: string;
  createdAt: string;
}

export interface DatabaseAdapter {
  /**
   * Run schema migrations / initialisation.
   */
  initialize(): Promise<void>;

  /**
   * Check if a project root has already been registered in the database,
   * returning its mapped project name.
   */
  getProjectNameByRoot(projectRoot: string): Promise<string | null>;

  /**
   * Register a new project and mapping in the metadata store.
   */
  registerProject(projectId: string, projectName: string, projectRoot: string): Promise<void>;

  // Learnings operations
  addLearning(record: LearningRecord): Promise<void>;
  queryLearnings(projectId: string, queryEmbedding: Float32Array, scopes: string[], limit: number): Promise<Array<LearningRecord & { score: number }>>;
  listLearnings(projectId: string, scopes: string[], limit: number): Promise<LearningRecord[]>;
  deleteLearning(id: string, projectId: string): Promise<void>;

  // History operations
  addHistory(record: HistoryRecord): Promise<void>;
  queryHistory(projectId: string, queryEmbedding: Float32Array, scopes: string[], limit: number): Promise<Array<HistoryRecord & { score: number }>>;
  listHistory(projectId: string, scopes: string[], limit: number): Promise<HistoryRecord[]>;
  deleteHistory(id: string, projectId: string): Promise<void>;
  
  // History Consolidation
  consolidateHistory(projectId: string): Promise<{
    entries: HistoryRecord[];
    consolidatedAt: string;
    previousCursor: string | null;
  }>;

  // Query Logging
  addQueryLog(record: QueryLogRecord): Promise<void>;
  getQueryLogs(projectId: string, limit?: number): Promise<QueryLogRecord[]>;

  // Metadata & Diagnostics
  getStats(projectId: string, scopes: string[]): Promise<{ learnCount: number; historyCount: number }>;
  close(): Promise<void>;
}
```

---

### 3. Startup & Team Mode Validation Logic

When the CLI starts up in **team mode** (with a PostgreSQL connection):
1. Compute the project's CWD root hash `projectId` (SHA-256 slice).
2. Call `getProjectNameByRoot(projectRoot)`.
3. If a name exists in the database, that name is used as the current project name for this session (guaranteeing consistency across developers working on the same project).
4. If no name exists, prompt or register the current project with the local name.

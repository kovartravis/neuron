Type: grilling
Status: resolved
Blocked by: 01

## Question

How should the auto-promotion mechanism track query frequencies and trigger scope promotions (people -> project -> global)? What are the exact threshold rules and count mechanics, and how does the CLI handle the migration of records across scopes?

## Answer

### 1. Execution Seam
- **Trigger**: Performed during `neuron history consolidate` / `neuron learn consolidate` or API method `checkAutoPromotions()`.

### 2. Matching & Tracking Mechanics
- **Semantic Matching**: Matches un-analyzed entries in `query_logs` against `learnings` where cosine similarity between embeddings is $\ge 0.80$.
- **Junction Table**:
  ```sql
  CREATE TABLE IF NOT EXISTS learning_query_matches (
    learning_id  TEXT NOT NULL,
    query_log_id TEXT NOT NULL,
    matched_at   TEXT NOT NULL,
    PRIMARY KEY (learning_id, query_log_id)
  );
  ```

### 3. Threshold Rules (Rolling 30-day Window)
- **Promotion**:
  - `people` $\rightarrow$ `project`: $\ge 5$ matches in last 30 days.
  - `project` $\rightarrow$ `global`: $\ge 15$ matches in last 30 days.
- **Demotion** (only if `is_manual_scope = 0`):
  - `global` $\rightarrow$ `project`: matches drop below 10 in last 30 days.
  - `project` $\rightarrow$ `people`: matches drop below 3 in last 30 days.

### 4. Manual Scope Lock
- **Flag**: `is_manual_scope INTEGER NOT NULL DEFAULT 0` (SQLite) / `BOOLEAN DEFAULT FALSE` (Postgres) on `learnings`.
- **Precedence**: When `--scope` is explicitly passed on `learn add` or `learn update`, `is_manual_scope` is set to `1` (true). Learnings with manual scope lock are locked to their assigned scope and exempt from automated promotion or demotion.


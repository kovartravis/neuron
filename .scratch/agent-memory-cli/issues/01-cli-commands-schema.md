Type: grilling
Status: resolved

## Question

What is the exact CLI command interface, option flags, and JSON output schema for the memory CLI? We need to specify commands like `add`, `query`, `delete`, and `status`, including their expected inputs and JSON outputs for programmatic consumption.

## Answer

### Package & binary name

`neuron` — installed and run via `npx neuron <command>`.

### Project scoping

All commands are project-scoped by default. The project is auto-detected by walking up from CWD to find a `package.json` or git root. The resolved project root is used as the project key.

### Command namespaces

Two top-level namespaces: `learn` and `history`.

#### `neuron learn`

| Command | Flags | Description |
|---|---|---|
| `neuron learn add "<content>"` | `--tags <tag,...>` | Store a new learning/rule |
| `neuron learn query "<question>"` | `--limit <n>` (default 5) | Semantic search — returns top-k learnings |
| `neuron learn list` | `--limit <n>` (default 20) | List all learnings for current project |
| `neuron learn delete <id>` | | Remove a learning by ID |

#### `neuron history`

| Command | Flags | Description |
|---|---|---|
| `neuron history add "<summary>"` | `--task-id <id>`, `--tags <tag,...>` | Log a completed agent action |
| `neuron history query "<question>"` | `--limit <n>` (default 5) | Semantic search — returns top-k history entries |
| `neuron history list` | `--limit <n>` (default 20) | List recent history entries |
| `neuron history delete <id>` | | Remove a history entry by ID |

### Output format

All commands output JSON to **stdout** by default. Progress/status messages (e.g. model loading) go to **stderr** only.

### JSON schemas

#### `add` response (both namespaces)

```json
{
  "id": "uuid",
  "status": "created",
  "project": "neuron"
}
```

#### `query` response (both namespaces)

```json
{
  "results": [
    {
      "id": "uuid",
      "content": "Always run tests before committing",
      "score": 0.92,
      "tags": ["testing"],
      "createdAt": "2026-07-11T12:00:00Z"
    }
  ],
  "project": "neuron",
  "query": "how should I handle tests?"
}
```

#### `neuron status` response

```json
{
  "project": "neuron",
  "projectRoot": "/Users/Travis/Repos/neuron",
  "db": "ready",
  "model": "ready",
  "modelName": "Xenova/all-MiniLM-L6-v2",
  "learnCount": 12,
  "historyCount": 47
}
```

`db` values: `"ready"` | `"uninitialized"`  
`model` values: `"ready"` | `"downloading"` | `"not-cached"`

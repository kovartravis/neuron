---
name: neuron-onboarding
description: First-time setup for @kovartravis/neuron in a fresh repo — detect and migrate existing CLAUDE.md/AGENTS.md/CURSOR.md content, interview the user on categories/storage/write-side enrichment/determinism, generate neuron.yaml, sync AGENTS.md, and configure architecture-scan settings. Use when onboarding a new project or setting up memory for the first time.
---

# Neuron Onboarding & First-Time Setup

This skill owns everything that happens **once**, the first time a project adopts `@kovartravis/neuron`: detecting and offering to migrate any existing rule file, the configuration interview, generating `neuron.yaml`, and syncing `AGENTS.md`/`CLAUDE.md`/`CURSOR.md`. It was split out of `neuron-memory` (wayfinder ticket 3, Map — MCP Server & Setup/Onboarding Skill Split) so that skill can narrow to the ongoing operate loop — context loading, pre-command lookup, failure recording, session-end recording, markdown sync, periodic maintenance, architecture-scan *execution* and drift reading, and in-session troubleshooting. **Once setup is complete, hand off to `neuron-memory` for everything else** — this skill has nothing to say about a project that already has a working `neuron.yaml`.

> [!CRITICAL]
> **USER INTERACTION & EXPLANATION MANDATE**
> Before taking ANY action (migrating file content, querying memory, writing `neuron.yaml` or `AGENTS.md`, running `neuron init`), the agent **MUST ALWAYS**:
> 1. **Ask the User**: confirm explicit intent and options before acting.
> 2. **Explain First**: clearly explain the exact action, CLI command, or file modification before executing it.

## Prerequisite: `neuron init`

If `neuron.yaml` does not exist yet, run `neuron init` first. It scaffolds a working config (`storage.mode: md`, default categories, default pull rules) and, for every detected harness, inserts a marker-bounded protocol block (`<!-- neuron:protocol:start -->` … `<!-- neuron:protocol:end -->`) into that harness's instructions file — **only that bounded region**, never the surrounding hand-written prose. This is safe to run before §0 below: it never touches content outside the markers, so any existing `CLAUDE.md`/`AGENTS.md`/`CURSOR.md` prose is still there afterward for §0 to detect.

## 0. Detect & Migrate Existing Rule Files (Onboarding-Migration)

Runs **before** §1's interview, not after — findings here inform which custom categories §1 proposes (e.g. ADR-shaped content found in a migrated file suggests offering a `decisions` category).

**Scope**: only the file shapes neuron's harness adapters already recognize — `CLAUDE.md`, `AGENTS.md`, `CURSOR.md` (per `src/config/harnesses.json`: `claude`→`CLAUDE.md`, `agents`/`github`/`codex`→`AGENTS.md`, `cursor`→`CURSOR.md`). **Not** `.cursorrules` — no adapter in code recognizes it, only stale docs once did. A repo can have more than one of these files at once (e.g. both `CLAUDE.md` and `CURSOR.md`); check each independently, and watch for the same rule appearing in more than one before writing it twice.

1. **Detect**: for each of the three filenames present at the project root, read it and locate the managed marker region with the same `findMarkerRange` logic `neuron init` uses (`src/config/protocolBlock.ts`) — everything **outside** that region is candidate content; everything inside it is neuron's own generated block and is never re-migrated. If a file has no marker region yet, its entire content is candidate. If a detected file's non-managed content is empty or absent, skip it silently — this is not an error.
2. **Parse**: read the candidate prose yourself (the invoking coding agent) and split it into discrete logical entries — rules, conventions, architectural decisions, failure-fixes, whatever the file actually contains. There is no separate embedded-model pipeline in neuron for this; do not invoke `neuron scan` or any inference job to do the splitting. For each entry, propose a category (an existing declared category if one fits, otherwise a sensible new one — e.g. `decisions` for ADR-shaped content) and the entry's content text.
3. **Preview & confirm**: before writing anything, show the user the full proposed entry list — content and proposed category, entry by entry — per this skill's own ask-first mandate. Get explicit confirmation. The user may accept all, reject some, or edit proposed categories/content before you write.
4. **Write**: for each confirmed entry, one `neuron memory add` call per logical entry:
   ```bash
   neuron memory add --category <proposed-or-user-corrected-category> "<entry content>"
   ```
   Leave `--tags` to inference; pass `--importance 4` or `5` for anything the user flags as important enough to survive a prune (see `neuron-memory` §6).
5. **Original file fate**: never modify or delete the source file. Migration is additive — the file stays exactly as it was, still human-readable, still read directly by any harness without a hook.
6. **Migration note — reuse the existing marker region, don't invent a new one**: after migrating, add one short paragraph *inside* the same `<!-- neuron:protocol:start -->` / `<!-- neuron:protocol:end -->` region already written by `neuron init` (e.g. right after the header line), noting what was migrated and when (source file, entry count, date). Do **not** create a second marker pair for this. This works with zero code changes: `upsertProtocolBlock` (`src/config/protocolBlock.ts`) already refuses to silently overwrite a managed region whose content differs from what it would generate — it asks first (or keeps existing, non-interactively) — so a hand-added migration note inside that region is already protected by the exact "existing overwrite/keep/ask policy" a later `neuron init --overwrite-hooks` would otherwise apply. That protection is *why* the note belongs inside the existing region instead of bare prose elsewhere in the file.

## 1. Initial Project Setup & Interview Protocol

> [!IMPORTANT]
> **`neuron init` already wrote a working `neuron.yaml`** (see Prerequisite, above). This interview is a **refinement** step, not the only path to a working project, and it now has an existing file to reason about — and, if §0 ran, migration findings to reason about too.
>
> That changes two things. First, **read the file before asking anything** and present the questions below as *"here is what you have; what should change?"* rather than as a blank-slate questionnaire. Second, **never rewrite the file wholesale** — it may already carry the user's edits. Change the keys the user asked about and leave the rest alone.

> [!NOTE]
> **`neuron.yaml` is a file the tool itself can write to, not just the agent (ADR 0017).** Categories stay advisory, not validated: a write against a category `neuron.yaml` doesn't yet declare is never rejected. Instead it auto-appends a minimal `categories.<name>: {}` block to the file on disk (comments and formatting preserved) the first time that category is written. So a `categories` entry with no `description`/`tags` you didn't add yourself is expected, not a sign something else edited the file — it's this hook converging the declared set toward what the store actually contains. `neuron status --repair` backfills any category that already had rows before this hook existed.

1. **Ask & Explain First (Interview Protocol)**:
   Before taking any action or writing configuration files, explain to the user what setup steps will be performed, and ask how they would like memory configured for their project:
   - **Default Categories**: `learning` (rules, conventions, failure fixes).
   - **Custom Categories**: Offer options to add custom categories such as `decisions` (ADRs & design choices), `snippets` (reusable code), or `architecture` — and anything §0's migration findings suggested.
   - **Storage Mode**: Ask whether memory should live as markdown files with SQLite kept as a derived index (`md` — the default, and what `init` wrote) or in the SQLite vector database only with no `.md` files (`vector`). Either can be overridden per category — see "Per-category storage" below — so routing e.g. a high-volume category to `vector` while everything else stays `md` doesn't need a special top-level mode; the override is always live. `md-only`, `dual`, `vector-only`, and `split` are all pre-2.3.0 spellings: `md-only` and `dual` now mean `md`, `vector-only` now means `vector`, and `split` (which used to be the only way to make a per-category override take effect) also now means `md` — all four still parse and warn on `stderr`. Do not write any of them into a new config.
     - Under `md`, the `.md` files are the **record of truth**: they are reconciled into the index on every command, and an entry deleted from a `.md` file is deleted from the index. That is the point of the mode, but say it out loud before recommending it — it means hand-editing those files is a supported operation *and* a destructive one.
   - **Per-category storage**: Ask if any individual category should override the top-level mode (e.g. `categories.telemetry.storage: vector` to keep a high-volume category out of markdown while the rest stays `md`). Precedence is `categories.<name>.storage > storage.mode > "md"`. If a category's resolved storage flips from `md` to `vector` and it already has an existing `.md` file, that file is left on disk but stops being updated — mention this so it doesn't go unnoticed.
   - **Exec Triggers**: Ask if there are specific shell commands (e.g. `npm test`, `git commit`, `cargo build`) that should trigger rule lookups.
   - **Write-Side Enrichment**: Ask which metadata the agent should keep supplying by hand and which `neuron memory add` should infer. See §1a below — this question has two halves, config *and* agent instructions, and answering only one produces a store that silently does not enrich.

   Architecture-scan configuration is its own step — see §2, below.

2. **Generate `neuron.yaml`**:
   Write `neuron.yaml` at the project root based on the user's answers (or standard defaults if they prefer default setup):
   ```yaml
   version: "1.0"

   storage:
     mode: md            # md | vector
     path: .neuron       # directory where .md category files are stored

   categories:
     learning:
       description: Agent conventions, rules, and failure fixes
       tags:
         - rule
         - convention

     # Custom categories requested by user:
     architecture:
       description: Architectural blueprints & structure cards
       tags:
         - architecture
         - topology
         - scan

   scan:
     enabled: true          # auto-scan on init; also enables drift reporting
                            # in `neuron status` and `neuron exec`
     category: architecture # target category for the blueprint card
     depth: 3               # structural traversal depth

   pullRules:
     default:
       categories:
         - learning
         - architecture
       limit: 5
       minScore: 0.35

     onExec:
       - commandPattern: ".*"
         categories:
           - learning
         limit: 5

       - commandPattern: "^(git|gh|npm) "
         categories:
           - learning
           - decisions
         limit: 8
   ```

3. **Configure & Align `AGENTS.md` / Instruction Files (Mandatory)**:
   Always write or update `AGENTS.md` (or `CLAUDE.md`, `CURSOR.md`) immediately after creating or updating `neuron.yaml`. Ensure it explicitly documents:
   - All declared categories from `neuron.yaml` (e.g., `learning`, `decisions`, `architecture`).
   - Architectural scan settings (e.g., `Architecture scan settings: enabled: true, category: architecture, depth: 3`).
   - CLI command examples for querying custom categories (e.g. `neuron memory query "<query>" --categories learning,decisions`).
   - CLI command examples for adding entries to custom categories (e.g. `neuron memory add --category decisions "<ADR details>" --tags adr,<topic>`).
   - If `storage.mode` (or any category's `storage` override) resolves to `md` (i.e. not `vector`), document the `.neuron/` directory, that those files are the record of truth, and the `neuron sync` command.

4. **Synchronize On Edits**:
   Whenever `neuron.yaml` is created or modified during setup, always update `AGENTS.md` immediately to keep category lists, CLI flags, and agent operating procedures strictly synchronized.

## 1a. Write-Side Enrichment Interview

`neuron memory add` can infer the metadata the caller did not supply. Every field
is optional, and **anything passed explicitly is honoured untouched** — inference
only ever fills a gap.

### The trade-off to present

| Posture | Write latency | Failure risk | Tag vocabulary |
|---|---|---|---|
| Agent passes all three flags | none | none | fragmented |
| Agent omits all three | up to ~3.5s per write | hard error when inference cannot answer | converged |
| **Agent passes `--category`, omits `--tags` and `--importance`** | **none** | **none** | **converged** |

**Recommend the third.** It is not a compromise: `--category` is the only field
whose omission can trigger a model load and the only one that can hard-fail the
write, while tags are selected by the already-loaded embedder for about a
millisecond.

> [!IMPORTANT]
> **`--importance` is never inferred.** There is no setting that infers it: the
> job was measured, found to be noise, and removed. An omitted `--importance` is
> stored as the default **`3`** — no model call, no inference. A trivial typo fix
> and a critical data-loss warning both land on `3`.
>
> This matters because `3` is also `neuron memory prune`'s default ceiling and
> the comparison is inclusive, so **every entry written without `--importance`
> becomes prune-eligible** once it is older than `--days`. Passing
> `--importance 4` or `5` at write time is the *only* thing that protects an
> entry from a bare prune. See `neuron-memory` §6.

Recommend the second posture for humans adding memories ad hoc, where a few
seconds are invisible and a readable error beats learning the project's taxonomy
first. The two can coexist — posture is protocol wording, not config.

### Why omitting `--tags` is the point

Tags and content are what the full-text index covers, so a fragmented tag
vocabulary is fragmented keyword recall: an entry tagged `treesitter` is
invisible to a query that says `tree-sitter`. Inferred tags are *selected* from a
closed vocabulary — every tag declared in `neuron.yaml`, plus every store tag
carried by at least three entries — so inference can only converge the
vocabulary, never widen it. Minting a new tag stays a deliberate act: pass it.

### The config half

```yaml
llm:
  enrichment:
    enabled: true          # master toggle; false is the A/B control arm
    category: infer        # infer | <declared-category-name> | off
    tags: infer            # infer | off
    categoryStrategy: centroid   # centroid | model
    timeoutMs: 15000
    maxTags: 3
    minTagSimilarity: 0.5
```

Points worth raising with the user:

- **`enabled` is separate from the per-field keys on purpose.** `enabled: false`
  disables the whole job and is the measurement arm; `category: off` is a
  standing preference that leaves the other fields inferring.
- **A literal category name is the *fallback***, used when inference cannot
  answer. Left as `infer`, that case is a hard error instead — which is the
  right default if filing an entry into the wrong category would be worse than
  being told to pass the flag.
- **There is no `importance` key.** It existed through 2.2.0-rc1/rc2 and was
  removed: the local 0.5B model's importance judgement benchmarked as
  *negatively* discriminating, so it shipped `off` and then went entirely. A
  `neuron.yaml` still carrying the key parses fine — the key is ignored. Tell the
  user to pass `--importance` on writes that must survive a prune.
- **`categoryStrategy: centroid` beat `model` 9/9 to 1/9** on the benchmark
  corpus. Its one weakness: a store with no entries has no centroids, so on a
  cold store an omitted `--category` hard-errors until the first entries are
  filed explicitly.

### The agent-instruction half (do not skip)

After writing `neuron.yaml`, update `AGENTS.md` / `CLAUDE.md` so the protocol's
command examples match the chosen posture. Config that infers tags while the
protocol still tells the agent to pass `--tags` on every write produces a store
where enrichment never runs — the config looks right and does nothing.

### Operating it

```bash
neuron memory add "<content>" --category learning   # recommended posture
neuron status                                       # degradation counters
```

Enrichment resolves inline on every write — both inferred fields use the
embedder that is already loaded on the write path — so there is nothing to drain
and no backlog to watch. Checking `enrichment.degraded` in `neuron status`
periodically is an ongoing-operation concern — see `neuron-memory`'s
Troubleshooting section.

## 1b. Determinism: Shape, Byte, Value — and `strict` Mode

"Deterministic" is not one property — neuron's own design work (ADR 0013,
ticket 36) split it into three, and only two of them ship on by default:

| Property | What it means | On by default? |
|---|---|---|
| **Shape** | Every entry conforms to its category's declared field schema — a required field with no `default:` hard-errors the write rather than landing malformed. | Yes, always enforced at `transact()`, the single choke point every writer shares. |
| **Byte** | A given input produces byte-identical output every time — the architecture card in particular (ticket 35/37) only changes when the codebase does. | Yes, always. |
| **Value** | The *values* a stored entry ends up with depend only on what the caller passed, never on unrelated store state. | **No — only under `strict: true`.** Off by default because centroid-based tag and category inference (§1a) is on by default, and centroids are built from whatever else is in the store, so the same content can enrich differently as the store changes. |

Value determinism is unreachable while inference runs, by construction — it
is not a bug the other two properties happen to share. A project that wants
to claim "fully deterministic," not just "schema- and byte-deterministic,"
has to give up inference's convenience for it. That trade is what `strict`
mode is for.

### What `strict: true` does

```yaml
strict: true   # top-level key, sibling to storage/categories/llm
```

- **Disables tag inference** (`llm.enrichment.tags: infer` becomes a no-op) —
  an entry gets exactly the tags the caller passed, or none.
- **Disables category *inference*** (`llm.enrichment.categoryStrategy`'s
  centroid/model call never runs) — an omitted `--category` hard-errors,
  naming `strict: true` as the cause, unless a fallback is configured (next
  bullet).
- **Does not touch a literal `llm.enrichment.category` fallback name.** A
  fixed category name is a constant, content-independent default, not
  inference — it stays available as the answer for an omitted `--category`
  even under `strict`, and using it never calls the embedder or the model.
- **Does not affect shape or byte determinism** — those are already always on
  and unaffected by this key.

### The trade-off to present

Recommending `strict` trades away §1a's "pass `--category`, let tags infer"
posture: **every write needs an explicit `--category`** (or a configured
fallback name), and **tags never auto-fill** — an agent that wants tags under
`strict` must pass `--tags` itself, which reintroduces the fragmented-
vocabulary risk §1a's inference exists to avoid. Recommend `strict` only when
the user has explicitly said the literal "deterministic" claim matters more
than that convenience; it is not the default recommendation from §1a's own
interview.

## 2. Architectural Scan Configuration (Initial)

Only the *initial* ask-and-configure half of architecture scanning lives here.
Scan *execution* and drift reading are operate-loop concerns and stay in
`neuron-memory` §7-8 — once this project's `scan:` block is written, hand off
there for running scans and reading drift.

1. **Ask & Explain Options First**:
   Before writing to `neuron.yaml`, explain the available architectural scan options to the user and ask for their preferences:
   - **`enabled`** (`true` / `false`): Enables or disables automatic architecture scanning on `neuron init`.
   - **`category`** (e.g. `architecture`): Specifies which memory category stores the generated architecture blueprint card (default: `architecture`).
   - **`depth`** (integer, default `3`): Controls directory tree traversal depth when analyzing codebase structure.
   - **Config Persist Option**: Ask the user if they would like to add or update these scan settings directly in `neuron.yaml`.

2. **Update Config & `AGENTS.md` (if confirmed by user)**:
   If the user confirms adding or updating scan configuration:
   - Add or update the `scan:` block in `neuron.yaml`:
     ```yaml
     scan:
       enabled: true
       category: architecture
       depth: 3
     ```
   - Immediately update `AGENTS.md` to document the active architecture scan settings (`Architecture scan settings: enabled: true, category: architecture, depth: 3`).
   - Explain the exact configuration edits made to the user.

After this, `neuron init`'s own scan-on-init behavior (or an explicit `neuron scan`) executes the first scan — see `neuron-memory` §7 for running scans and reading the blueprint, and §8 for the drift protocol.

## See also

**`neuron-memory`** owns everything after setup: beginning-of-run context loading, pre-command lookup, closed-loop failure feedback, end-of-run recording, markdown storage & sync, periodic maintenance (review/prune), architecture-scan execution and drift reading, and in-session troubleshooting (enrichment degradation, sync conflicts, prune surprises, drift/re-baseline confusion, strict-mode write errors). Once `neuron.yaml` exists and this skill's steps are done, that skill takes over — nothing here repeats there.

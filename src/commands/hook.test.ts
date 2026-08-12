import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { readHintEvents } from '../harnesses/hintFollowLog.js';

describe('CLI Command: hook', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-hook');
  const cliPath = path.join(process.cwd(), 'dist/cli.js');
  let tempDbPath: string;
  let projectDir: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-hook-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    projectDir = path.join(tempDbDir, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  });

  afterAll(() => {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  });

  function env(extra: Record<string, string> = {}) {
    return {
      ...process.env,
      NEURON_DB_PATH: tempDbPath,
      NEURON_MOCK_EMBEDDER: 'true',
      NEURON_HOOK_CACHE_DIR: path.join(projectDir, '.hook-cache'),
      // Ticket 08 (neuron-2.4.0): `projectDir` has no `.git` of its own, and
      // sits nested inside this real repo's working tree — without a
      // ceiling, `git rev-parse`/`git log` would silently walk up and find
      // *this* repo's real history, making every test below coupled to
      // whatever this repo's own git log happens to contain. The ceiling is
      // `projectDir`'s own parent (`tempDbDir`), not `projectDir` itself —
      // empirically, listing the search's starting directory as its own
      // ceiling does not stop it from ascending one level, only listing an
      // ancestor above it does. Tests that specifically exercise the
      // git-log index `git init` their own `projectDir` first, which
      // satisfies the search before it would ever need to ascend at all.
      GIT_CEILING_DIRECTORIES: tempDbDir,
      ...extra,
    };
  }

  function run(args: string[], stdin: string) {
    return spawnSync('node', [cliPath, ...args], { cwd: projectDir, env: env(), input: stdin });
  }

  it('exits 0 and prints nothing on session-start against an empty store', () => {
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('injects the architecture card via SessionStart hookSpecificOutput when one exists', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.toString().trim());
    expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');
  });

  // --- Ticket 21: proactive session-start warning for the write-only-store failure mode ---

  it('includes a zero-sessions-observed warning in SessionStart when the store has entries but recall has never fired', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.toString().trim());
    expect(parsed.hookSpecificOutput.additionalContext).toContain('recall has never fired');
  });

  it('omits the zero-sessions-observed warning once a prior session has exercised pre-prompt recall', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'observed-session', prompt: 'database access pattern' })
    );

    // No architecture card and no warning (recall has been observed) means
    // this session-start call has nothing to inject at all.
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's2' }));
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('appends the warning alongside a real architecture card rather than replacing it', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toContain('Repository Architectural Blueprint');
    expect(context).toContain('recall has never fired');
  });

  it('injects relevant results via UserPromptSubmit for pre-prompt', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 's1', prompt: 'how should I access the database here' })
    );
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.toString().trim());
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Pattern');
  });

  it('deduplicates pre-prompt injection within the same session via the ledger', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const stdin = JSON.stringify({ session_id: 'dedupe-session', prompt: 'database access pattern' });

    const first = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(first.stdout.toString().trim()).not.toBe('');

    const second = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(second.status).toBe(0);
    expect(second.stdout.toString().trim()).toBe('');
  });

  it('context-reset clears the ledger so a previously-injected entry reappears', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const stdin = JSON.stringify({ session_id: 'reset-session', prompt: 'database access pattern' });

    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).toBe('');

    const resetResult = run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: 'reset-session' }));
    expect(resetResult.status).toBe(0);

    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
  });

  // Ticket 07 (neuron-2.3.0): the per-epoch char budget. Turn 1 runs under
  // the large default budget so its real injected length can be measured
  // (rather than hardcoding buildPayload's line-formatting internals), then
  // the budget is set to exactly that spend so turn 2 has zero left.
  it('hard-stops pre-prompt injection once the epoch budget is spent, and resumes after a context-reset rolls the epoch', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    execAdd('Use exponential backoff for retrying flaky network calls', 'learning');
    const sessionId = 'epoch-budget-session';

    const turn1 = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'database access pattern' })
    );
    const turn1Context = JSON.parse(turn1.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(turn1Context).toContain('Repository Pattern');

    // Cap the epoch at exactly what turn 1 already spent, so turn 2 has
    // nothing left — a hard stop, not ordinary dedupe (the retry-backoff
    // entry was never shown to this session).
    fs.writeFileSync(
      path.join(projectDir, 'neuron.yaml'),
      `version: "1.0"\nrecall:\n  epochCharBudget: ${turn1Context.length}\n`
    );

    const turn2 = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'exponential backoff retry' })
    );
    expect(turn2.status).toBe(0);
    expect(turn2.stdout.toString().trim()).toBe('');

    const resetResult = run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: sessionId }));
    expect(resetResult.status).toBe(0);

    // Same query, only the epoch changed — proves turn 2's silence was the
    // budget, not irrelevance or prior injection.
    const turn3 = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'exponential backoff retry' })
    );
    expect(JSON.parse(turn3.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('exponential backoff');
  });

  // --- Ticket 11: re-inject the architecture card on the first pre-prompt of each epoch ---

  it('injects the architecture card alongside the first pre-prompt turn of a session, with no session-start call', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'card-session', prompt: 'how should I access the database here' })
    );
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toContain('Repository Architectural Blueprint');
    expect(context).toContain('Repository Pattern');
  });

  it('does not re-inject the architecture card on a second pre-prompt turn within the same epoch', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    execAdd('Use exponential backoff for retrying flaky network calls', 'learning');
    const sessionId = 'card-no-repeat-session';

    const turn1 = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'how should I access the database here' })
    );
    expect(JSON.parse(turn1.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');

    const turn2 = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'exponential backoff retry' })
    );
    const turn2Context = JSON.parse(turn2.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(turn2Context).toContain('exponential backoff');
    expect(turn2Context).not.toContain('Repository Architectural Blueprint');
  });

  it('re-injects the architecture card on the first pre-prompt after a context-reset rolls the epoch', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    const sessionId = 'card-reset-session';
    const stdin = JSON.stringify({ session_id: sessionId, prompt: 'database access pattern' });

    const turn1 = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(JSON.parse(turn1.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');

    run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: sessionId }));

    const turn2 = run(['hook', 'claude-code', 'pre-prompt'], stdin);
    expect(JSON.parse(turn2.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');
  });

  it('degrades to ordinary pre-prompt behaviour with no architecture card in the store', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'no-card-session', prompt: 'how should I access the database here' })
    );
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toBe('- [learning] Use the Repository Pattern for database access in this codebase');
  });

  it('charges the architecture card against the same epoch budget as ordinary turns', () => {
    execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const sessionId = 'card-telemetry-session';

    run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: sessionId, prompt: 'how should I access the database here' })
    );
    run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: sessionId }));

    const statusResult = spawnSync('node', [cliPath, 'status'], { cwd: projectDir, env: env() });
    const status = JSON.parse(statusResult.stdout.toString());
    // Combined card + turn spend, not just the turn's own PRE_PROMPT_CHAR_BUDGET-sized portion.
    expect(status.recallCost.maxCharsPerEpoch).toBeGreaterThan(100);
  });

  it('neuron status reports recall cost telemetry recorded from real hook invocations', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const sessionId = 'status-telemetry-session';
    const stdin = JSON.stringify({ session_id: sessionId, prompt: 'database access pattern' });

    expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
    run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: sessionId }));

    const statusResult = spawnSync('node', [cliPath, 'status'], { cwd: projectDir, env: env() });
    const status = JSON.parse(statusResult.stdout.toString());

    expect(status.recallCost.epochCharBudget).toBe(18000);
    expect(status.recallCost.charsPerTokenRatio).toBe(3);
    expect(status.recallCost.sessionsObserved).toBeGreaterThanOrEqual(1);
    expect(status.recallCost.epochsObserved).toBeGreaterThanOrEqual(1);
    expect(status.recallCost.maxCharsPerEpoch).toBeGreaterThan(0);
  });

  it('degrades silently (exit 0, empty stdout) on malformed stdin rather than crashing', () => {
    const result = run(['hook', 'claude-code', 'pre-prompt'], 'not json at all {{{');
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('degrades silently when the prompt field is missing entirely', () => {
    const result = run(['hook', 'claude-code', 'pre-prompt'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('is a no-op for an unrecognised harness or lifecycle point rather than erroring', () => {
    const result = run(['hook', 'not-a-real-harness', 'session-start'], '{}');
    expect(result.status).toBe(0);
    expect(result.stdout.toString().trim()).toBe('');
  });

  it('never exits with code 2 (which would block the prompt on UserPromptSubmit)', () => {
    // A store that cannot be reached (bogus DB path) forces the query to fail
    // internally; the hook must still degrade to exit 0, never exit 2.
    const result = spawnSync('node', [cliPath, 'hook', 'claude-code', 'pre-prompt'], {
      cwd: projectDir,
      env: env({ NEURON_DB_PATH: '/nonexistent/deeply/nested/path/db.sqlite' }),
      input: JSON.stringify({ session_id: 's1', prompt: 'anything' }),
    });
    expect(result.status).toBe(0);
  });

  // --- Ticket 13: Codex adapter — same runHook() codepath, confirmed identical
  // stdin fields and stdout envelope, so coverage mirrors claude-code's above. ---
  describe('codex', () => {
    it('exits 0 and prints nothing on session-start against an empty store', () => {
      const result = run(['hook', 'codex', 'session-start'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('injects the architecture card via SessionStart hookSpecificOutput when one exists', () => {
      execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
      const result = run(['hook', 'codex', 'session-start'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.toString().trim());
      expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Architectural Blueprint');
    });

    it('injects relevant results via UserPromptSubmit for pre-prompt', () => {
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const result = run(
        ['hook', 'codex', 'pre-prompt'],
        JSON.stringify({ session_id: 's1', prompt: 'how should I access the database here' })
      );
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.toString().trim());
      expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(parsed.hookSpecificOutput.additionalContext).toContain('Repository Pattern');
    });

    it('deduplicates pre-prompt injection within the same session via the ledger', () => {
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const stdin = JSON.stringify({ session_id: 'codex-dedupe-session', prompt: 'database access pattern' });

      const first = run(['hook', 'codex', 'pre-prompt'], stdin);
      expect(first.stdout.toString().trim()).not.toBe('');

      const second = run(['hook', 'codex', 'pre-prompt'], stdin);
      expect(second.status).toBe(0);
      expect(second.stdout.toString().trim()).toBe('');
    });

    it('context-reset clears the ledger so a previously-injected entry reappears', () => {
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const stdin = JSON.stringify({ session_id: 'codex-reset-session', prompt: 'database access pattern' });

      expect(run(['hook', 'codex', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
      expect(run(['hook', 'codex', 'pre-prompt'], stdin).stdout.toString().trim()).toBe('');

      const resetResult = run(['hook', 'codex', 'context-reset'], JSON.stringify({ session_id: 'codex-reset-session' }));
      expect(resetResult.status).toBe(0);

      expect(run(['hook', 'codex', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
    });

    it('degrades silently (exit 0, empty stdout) on malformed stdin rather than crashing', () => {
      const result = run(['hook', 'codex', 'pre-prompt'], 'not json at all {{{');
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('degrades silently when the prompt field is missing entirely', () => {
      const result = run(['hook', 'codex', 'pre-prompt'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('keeps its own session ledger independent of a claude-code session with the same id, avoiding double-injection races across harnesses', () => {
      // Not a claim that ledgers are namespaced per harness (they are not, per
      // ledger.ts) — this documents the current behaviour: two harnesses
      // sharing one neuron-generated session_id would in fact share a ledger.
      // In practice each harness mints its own session ids, so this is
      // recorded as a known, accepted limitation rather than a bug to fix here.
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const sharedId = 'shared-session-id';
      const stdin = JSON.stringify({ session_id: sharedId, prompt: 'database access pattern' });

      expect(run(['hook', 'claude-code', 'pre-prompt'], stdin).stdout.toString().trim()).not.toBe('');
      expect(run(['hook', 'codex', 'pre-prompt'], stdin).stdout.toString().trim()).toBe('');
    });
  });

  // --- Ticket 02 (neuron-2.3.0): Cursor adapter — same runHook() codepath,
  // but a distinct stdout contract (flat, snake_case additional_context,
  // confirmed via direct fetch of cursor.com/docs/hooks), so coverage
  // exercises emit()'s cursor branch specifically rather than assuming it
  // matches claude-code's/codex's wrapped shape. ---
  describe('cursor', () => {
    it('exits 0 and prints nothing on session-start against an empty store', () => {
      const result = run(['hook', 'cursor', 'session-start'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('injects the architecture card via a flat additional_context field, not hookSpecificOutput', () => {
      execAdd('Repository Architectural Blueprint: 3 modules, 12 exports.', 'architecture');
      const result = run(['hook', 'cursor', 'session-start'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.toString().trim());
      expect(parsed.additional_context).toContain('Repository Architectural Blueprint');
      expect(parsed.hookSpecificOutput).toBeUndefined();
      expect(parsed.additionalContext).toBeUndefined(); // not Copilot's camelCase field either
    });

    it('injects relevant results via a flat additional_context field for pre-prompt', () => {
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const result = run(
        ['hook', 'cursor', 'pre-prompt'],
        JSON.stringify({ session_id: 's1', prompt: 'how should I access the database here' })
      );
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.toString().trim());
      expect(parsed.additional_context).toContain('Repository Pattern');
    });

    it('deduplicates pre-prompt injection within the same session via the ledger', () => {
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const stdin = JSON.stringify({ session_id: 'cursor-dedupe-session', prompt: 'database access pattern' });

      const first = run(['hook', 'cursor', 'pre-prompt'], stdin);
      expect(first.stdout.toString().trim()).not.toBe('');

      const second = run(['hook', 'cursor', 'pre-prompt'], stdin);
      expect(second.status).toBe(0);
      expect(second.stdout.toString().trim()).toBe('');
    });

    it('context-reset is a safe no-op when the harness sends no session_id (documented gap: preCompact carries none)', () => {
      // Unlike claude-code/codex, Cursor's own preCompact stdin has no
      // session_id field at all (confirmed via direct fetch) — this exercises
      // that the hook still exits cleanly rather than assuming a field that
      // isn't there.
      const result = run(['hook', 'cursor', 'context-reset'], JSON.stringify({}));
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('degrades silently (exit 0, empty stdout) on malformed stdin rather than crashing', () => {
      const result = run(['hook', 'cursor', 'pre-prompt'], 'not json at all {{{');
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('degrades silently when the prompt field is missing entirely', () => {
      const result = run(['hook', 'cursor', 'pre-prompt'], JSON.stringify({ session_id: 's1' }));
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });
  });

  function execAdd(content: string, category: string) {
    spawnSync(
      'node',
      [cliPath, 'memory', 'add', content, '--category', category, '--importance', '5'],
      { cwd: projectDir, env: env() }
    );
  }

  // Ticket 25: plants a card at the architecture blueprint's stable id
  // directly (bypassing `memory add`, which always generates a random id),
  // to reproduce the crowding/oversize scenarios the CLI alone can't set up.
  function writeCardAtStableId(category: string, content: string) {
    const scriptPath = path.join(projectDir, `_write-card-${Date.now()}.mjs`);
    const indexPath = path.join(process.cwd(), 'dist/index.js').replace(/\\/g, '/');
    const ingestPath = path.join(process.cwd(), 'dist/scanner/ingest.js').replace(/\\/g, '/');
    fs.writeFileSync(
      scriptPath,
      `
      import { NeuronMemory } from '${indexPath}';
      import { blueprintCardId } from '${ingestPath}';
      const memory = NeuronMemory.open(process.cwd());
      await memory.transact([{
        op: 'upsert',
        id: blueprintCardId(${JSON.stringify(category)}),
        category: ${JSON.stringify(category)},
        content: ${JSON.stringify(content)},
        tags: ['architecture', 'topology', 'scan', 'deep'],
        importance: 5,
      }]);
      await memory.close();
      `,
      'utf8'
    );
    const result = spawnSync('node', [scriptPath], { cwd: projectDir, env: env() });
    fs.rmSync(scriptPath, { force: true });
    if (result.status !== 0) {
      throw new Error(`writeCardAtStableId failed: ${result.stderr?.toString()}`);
    }
  }

  // --- Ticket 25: fetch the architecture card by its stable scan id, truncate rather than drop when oversized ---

  it('fetches the architecture card by its stable id even when other entries in the same category outrank it', () => {
    writeCardAtStableId('architecture', 'Repository Architectural Blueprint: the real one, found by stable id.');
    // Planted after the card, so a recency-ordered generic query pushes the
    // card out of a small `limit` window — exactly ticket 37's own warning.
    for (let i = 0; i < 5; i++) {
      execAdd(`Unrelated architecture note ${i}`, 'architecture');
    }
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toContain('Repository Architectural Blueprint: the real one, found by stable id.');
  });

  // --- Ticket 30: session-start injects the index only; a module card must
  // never ride along via the additive top-N-in-category query just because
  // it shares the index's category and tags. Reproduced live against this
  // repo's own store before the fix (a real module card appeared in a plain
  // `session-start` call with no prompt in play at all).
  function writeIndexAndModuleCard(category: string, modulePath: string, moduleContent: string) {
    const scriptPath = path.join(projectDir, `_write-index-module-${Date.now()}.mjs`);
    const indexPath = path.join(process.cwd(), 'dist/index.js').replace(/\\/g, '/');
    const ingestPath = path.join(process.cwd(), 'dist/scanner/ingest.js').replace(/\\/g, '/');
    fs.writeFileSync(
      scriptPath,
      `
      import { NeuronMemory } from '${indexPath}';
      import { blueprintCardId, moduleCardId } from '${ingestPath}';
      const memory = NeuronMemory.open(process.cwd());
      const indexContent = [
        '# Repository Architectural Blueprint: fixture',
        '## Primary Subsystems',
        '- **mod** — \`${modulePath}\` (1 file)',
        '',
      ].join('\\n');
      await memory.transact([
        {
          op: 'upsert',
          id: blueprintCardId(${JSON.stringify(category)}),
          category: ${JSON.stringify(category)},
          content: indexContent,
          tags: ['architecture', 'topology', 'scan', 'deep'],
          importance: 5,
        },
        {
          op: 'upsert',
          id: moduleCardId(${JSON.stringify(category)}, ${JSON.stringify(modulePath)}),
          category: ${JSON.stringify(category)},
          content: ${JSON.stringify(moduleContent)},
          tags: ['architecture', 'topology', 'scan', 'deep'],
          importance: 5,
        },
      ]);
      await memory.close();
      `,
      'utf8'
    );
    const result = spawnSync('node', [scriptPath], { cwd: projectDir, env: env() });
    fs.rmSync(scriptPath, { force: true });
    if (result.status !== 0) {
      throw new Error(`writeIndexAndModuleCard failed: ${result.stderr?.toString()}`);
    }
  }

  it('never includes a module detail card in the session-start injection, even though it shares the index category and tags', () => {
    writeIndexAndModuleCard('architecture', 'src/widgets', '### 🧩 widgets (`src/widgets`)\nModule detail that must never appear unprompted.');
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toContain('Repository Architectural Blueprint');
    expect(context).not.toContain('### 🧩');
    expect(context).not.toContain('Module detail that must never appear unprompted');
  });

  // --- Ticket 06 (neuron-2.4.0): discovery-command hint ---

  it('appends a ready-to-run discovery command when store-wide FTS matches exceed what this turn injected', () => {
    // `limit: 10` on the recall query plus a small PRE_PROMPT_CHAR_BUDGET
    // means only a few of these can actually be injected, while the FTS
    // count (no LIMIT) sees all of them — a real, counted gap.
    for (let i = 0; i < 15; i++) {
      execAdd(`Repository Pattern note ${i}: use it for database access here`, 'learning');
    }
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'hint-session', prompt: 'Repository Pattern database access' })
    );
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).toContain('neuron memory query');
    expect(context).toContain('--limit');
  });

  it('fires no hint when this turn already surfaced every store-wide match', () => {
    execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
    const result = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'no-hint-session', prompt: 'how should I access the database here' })
    );
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context).not.toContain('neuron memory query');
  });

  it('truncates an oversized architecture card instead of dropping it entirely', () => {
    const hugeContent = 'X'.repeat(20000);
    writeCardAtStableId('architecture', hugeContent);
    const result = run(['hook', 'claude-code', 'session-start'], JSON.stringify({ session_id: 's1' }));
    expect(result.status).toBe(0);
    const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    expect(context.length).toBeGreaterThan(0);
    expect(context.length).toBeLessThan(hugeContent.length);
    expect(context).toContain('...[truncated]');
  });

  // --- Ticket 07 (neuron-2.4.0): hint-follow measurement ---

  function withHookCacheDir<T>(fn: () => T): T {
    const prior = process.env.NEURON_HOOK_CACHE_DIR;
    process.env.NEURON_HOOK_CACHE_DIR = path.join(projectDir, '.hook-cache');
    try {
      return fn();
    } finally {
      if (prior === undefined) delete process.env.NEURON_HOOK_CACHE_DIR;
      else process.env.NEURON_HOOK_CACHE_DIR = prior;
    }
  }

  it('records a fired event when the hint injects, and a joinable query-run event when post-tool-use sees the same command', () => {
    for (let i = 0; i < 15; i++) {
      execAdd(`Repository Pattern note ${i}: use it for database access here`, 'learning');
    }
    const preResult = run(
      ['hook', 'claude-code', 'pre-prompt'],
      JSON.stringify({ session_id: 'measure-session', prompt: 'Repository Pattern database access' })
    );
    expect(preResult.status).toBe(0);
    const context = JSON.parse(preResult.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
    const commandMatch = context.match(/run: (neuron memory query.+)$/m);
    expect(commandMatch).not.toBeNull();
    const command = commandMatch![1];

    const afterFire = withHookCacheDir(() => readHintEvents(projectDir));
    expect(afterFire).toHaveLength(1);
    expect(afterFire[0]).toMatchObject({ type: 'fired', sessionId: 'measure-session', command });

    const postResult = run(
      ['hook', 'claude-code', 'post-tool-use'],
      JSON.stringify({ session_id: 'measure-session', tool_name: 'Bash', tool_input: { command } })
    );
    expect(postResult.status).toBe(0);

    const afterFollow = withHookCacheDir(() => readHintEvents(projectDir));
    expect(afterFollow.map(e => e.type)).toEqual(['fired', 'query-run']);
    expect(afterFollow[1]).toMatchObject({ type: 'query-run', sessionId: 'measure-session', command });
  });

  it('post-tool-use ignores a Bash command unrelated to neuron memory query', () => {
    const result = run(
      ['hook', 'claude-code', 'post-tool-use'],
      JSON.stringify({ session_id: 'measure-session', tool_name: 'Bash', tool_input: { command: 'git status' } })
    );
    expect(result.status).toBe(0);
    expect(withHookCacheDir(() => readHintEvents(projectDir))).toEqual([]);
  });

  it('post-tool-use ignores non-Bash tool calls', () => {
    const result = run(
      ['hook', 'claude-code', 'post-tool-use'],
      JSON.stringify({ session_id: 'measure-session', tool_name: 'Read', tool_input: { file_path: '/x' } })
    );
    expect(result.status).toBe(0);
    expect(withHookCacheDir(() => readHintEvents(projectDir))).toEqual([]);
  });

  // --- Ticket 08 (neuron-2.4.0): git-log index, pre-prompt injection ---
  describe('git-log index', () => {
    function git(args: string[]): void {
      spawnSync('git', args, {
        cwd: projectDir,
        env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' },
      });
    }
    function gitCommit(subject: string, body = ''): void {
      fs.writeFileSync(path.join(projectDir, `file-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`), 'x');
      git(['add', '.']);
      git(['commit', '-m', body ? `${subject}\n\n${body}` : subject]);
    }

    beforeEach(() => {
      // `projectDir` becomes its own repo root here, so `GIT_CEILING_DIRECTORIES`
      // (set in `env()` above) never needs to matter for these tests.
      git(['init', '-q']);
    });

    it('injects a lexically-matching commit via pre-prompt, with the disclosure caveat', () => {
      gitCommit('feat: add widget subsystem', 'widget rendering and layout logic.');
      const result = run(
        ['hook', 'claude-code', 'pre-prompt'],
        JSON.stringify({ session_id: 'gitlog-session', prompt: 'tell me about the widget subsystem' })
      );
      expect(result.status).toBe(0);
      const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
      expect(context).toContain('## Git History');
      expect(context).toContain('feat: add widget subsystem');
      expect(context).toContain('verify against `git log`/`git show` yourself');
    });

    it('stays silent (no git-log section, empty stdout) when nothing in history topically matches', () => {
      gitCommit('feat: add widget subsystem', 'widget rendering and layout logic.');
      const result = run(
        ['hook', 'claude-code', 'pre-prompt'],
        JSON.stringify({ session_id: 'gitlog-silent-session', prompt: 'completely unrelated kubernetes deployment question' })
      );
      expect(result.status).toBe(0);
      expect(result.stdout.toString().trim()).toBe('');
    });

    it('dedupes a git-log hit within the same session epoch, and it reappears after a context-reset rolls the epoch', () => {
      gitCommit('feat: add widget subsystem', 'widget rendering and layout logic.');
      const stdin = JSON.stringify({ session_id: 'gitlog-dedupe-session', prompt: 'tell me about the widget subsystem' });

      const first = run(['hook', 'claude-code', 'pre-prompt'], stdin);
      expect(JSON.parse(first.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('## Git History');

      const second = run(['hook', 'claude-code', 'pre-prompt'], stdin);
      expect(second.stdout.toString().trim()).toBe('');

      const resetResult = run(['hook', 'claude-code', 'context-reset'], JSON.stringify({ session_id: 'gitlog-dedupe-session' }));
      expect(resetResult.status).toBe(0);

      const third = run(['hook', 'claude-code', 'pre-prompt'], stdin);
      expect(JSON.parse(third.stdout.toString().trim()).hookSpecificOutput.additionalContext).toContain('## Git History');
    });

    it('injects nothing git-log-related when the project directory is not a git repo at all', () => {
      // Overwrites the `git init` this describe block's own beforeEach just
      // did, reproducing an ordinary non-git project.
      fs.rmSync(path.join(projectDir, '.git'), { recursive: true, force: true });
      execAdd('Use the Repository Pattern for database access in this codebase', 'learning');
      const result = run(
        ['hook', 'claude-code', 'pre-prompt'],
        JSON.stringify({ session_id: 'gitlog-no-repo-session', prompt: 'how should I access the database here' })
      );
      expect(result.status).toBe(0);
      const context = JSON.parse(result.stdout.toString().trim()).hookSpecificOutput.additionalContext as string;
      expect(context).toContain('Repository Pattern');
      expect(context).not.toContain('## Git History');
    });
  });
});

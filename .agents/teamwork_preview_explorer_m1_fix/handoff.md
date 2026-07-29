# Handoff Report — Explorer M1 Fix (MdStorageAdapter Remediation Strategy)

**Target Module**: `src/storage/mdStorageAdapter.ts` & `src/storage/mdVectorSync.test.ts`  
**Author**: Explorer M1 Fix (MdStorageAdapter Remediation Specialist)  
**Date**: 2026-07-28  

---

## 1. Observation

### Test Failure & Build Diagnostics
1. **Vitest Unit Test Failures (`src/storage/mdStorageAdapter.test.ts`)**:
   - 7 out of 10 tests failing (R1-T1-01, R1-T1-02, R1-T1-03, R1-T1-04, R1-T1-05, R1-T2-02, R1-T2-04).
   - In all failed tests, `memories[0].id` evaluated to a freshly generated `crypto.randomUUID()` instead of the expected string `id` (e.g. `'test-id-123'`, `'mem-001'`, `'malformed-id'`, `'complex-id'`).
2. **Empirical Challenger Stress Harness (`src/storage/mdStorageAdapter.challenger.test.ts`)**:
   - 10 test failures caused by identical frontmatter parsing defects.
3. **TypeScript Compilation (`npm run build`)**:
   - Verified current state of `src/storage/mdVectorSync.test.ts`. `defaultConfig` on line 34 includes `version: '1.0'`. `npm run build` exits cleanly with code 0.

### Deep Code Inspection of `src/storage/mdStorageAdapter.ts`

- **Defect 1: Destructive Boundary Splitting Regex (Lines 264-270)**
  ```ts
  const rawBlocks = content.split(/(?:^|\n)---\r?\n/).filter(b => b.trim().length > 0);
  for (const block of rawBlocks) {
    const closingIndex = block.indexOf('\n---');
    if (closingIndex === -1) {
      continue;
    }
  ...
  ```
  `content.split(/(?:^|\n)---\r?\n/)` splits the content at **every** delimiter occurrence (both opening `---` and closing `---`, as well as body horizontal rules `---`).
  When `split` consumes closing `---` delimiters, `block` contains only the raw YAML text without trailing `\n---`. As a result, `block.indexOf('\n---')` evaluates to `-1` for every block. All blocks are skipped via `continue;`, leaving `memories` empty and causing fallback UUID generation for every record.

- **Defect 2: Malformed YAML Parse Error Handling (Lines 276-283)**
  ```ts
  try {
    const parsed = parseYaml(yamlStr);
    if (parsed && typeof parsed === 'object') {
      frontmatter = parsed;
    }
  } catch {
    // Fallback to empty frontmatter on parse error
  }
  ```
  When `parseYaml(yamlStr)` throws an exception on malformed YAML (e.g. `invalid: : : yaml syntax error`), `frontmatter` remains `{}`. The parser ignores valid single-line key-value pairs (like `id: malformed-id`) that were present in the frontmatter block, defaulting `id` to `crypto.randomUUID()`.

---

## 2. Logic Chain

1. **Frontmatter Block Identification**:
   - Formatted Markdown files produced by `MdStorageAdapter` contain entry blocks formatted as:
     ```markdown
     ---
     id: <entry-id>
     createdAt: <timestamp>
     importance: <number>
     tags: [...]
     ---
     <entry body content>
     ```
2. **Regex Match vs. Delimiter Split**:
   - Instead of splitting the string into array fragments, `parseMarkdown` should execute a global regular expression match for frontmatter blocks:
     `/(?:^|\n)---\r?\n([\s\S]*?)\r?\n---\r?\n/g`
3. **Filtering Body Horizontal Rules (`---`)**:
   - To prevent false positive matches when Markdown entry content contains horizontal rules (`---`), candidate blocks should be validated by checking if `yamlStr` contains YAML key-value pair syntax (`/^\s*[a-zA-Z0-9_-]+\s*:/m`).
4. **Body Content Boundary Calculation**:
   - The body text for match `i` starts immediately after match `i`'s closing `---` (`match.index + match[0].length`).
   - The body text ends at the start index of match `i + 1` (or the end of the file string if match `i` is the last frontmatter block).
5. **Graceful Malformed Frontmatter Recovery**:
   - When `parseYaml(yamlStr)` throws a syntax error, a line-by-line fallback parser scans `yamlStr` for single-line `key: value` pairs matching `/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/`. This guarantees that valid properties like `id: malformed-id` are preserved even if subsequent YAML lines are syntactically invalid.

---

## 3. Caveats

- **No Caveats**: The proposed refactoring of `parseMarkdown` is fully backward and forward compatible with all existing data contracts. No changes to public API signatures or dependencies are required.

---

## 4. Conclusion & Complete Fix Strategy

### Recommended Replacement Code for `src/storage/mdStorageAdapter.ts`

Replace `parseMarkdown` (lines 260-335) with the following complete, robust implementation:

```ts
  /**
   * Parses Markdown content into an array of Memory objects.
   */
  parseMarkdown(content: string, category: string): Memory[] {
    const memories: Memory[] = [];

    // Find all valid frontmatter blocks delimited by `---` on dedicated lines
    const frontmatterRegex = /(?:^|\n)---\r?\n([\s\S]*?)\r?\n---\r?\n/g;

    interface BlockMatch {
      matchStart: number;
      bodyStart: number;
      yamlStr: string;
    }

    const matches: BlockMatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = frontmatterRegex.exec(content)) !== null) {
      const yamlStr = match[1];
      // Verify candidate block contains key-value pairs to distinguish frontmatter from body horizontal rules `---`
      if (/^\s*[a-zA-Z0-9_-]+\s*:/m.test(yamlStr)) {
        matches.push({
          matchStart: match.index,
          bodyStart: match.index + match[0].length,
          yamlStr,
        });
      }
    }

    if (matches.length === 0) {
      // Fallback for files without frontmatter blocks
      const cleanContent = content.replace(/^# Category:.*$/m, '').trim();
      if (cleanContent) {
        memories.push({
          id: crypto.randomUUID(),
          category,
          kind: category,
          content: cleanContent,
          tags: [],
          importance: 1,
          createdAt: new Date().toISOString(),
        });
      }
      return memories;
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      const bodyEnd = next ? next.matchStart : content.length;
      const rawBody = content.slice(current.bodyStart, bodyEnd);
      const bodyStr = rawBody.trim();
      const yamlStr = current.yamlStr.trim();

      let frontmatter: Record<string, any> = {};
      try {
        const parsed = parseYaml(yamlStr);
        if (parsed && typeof parsed === 'object') {
          frontmatter = parsed;
        } else {
          frontmatter = {};
        }
      } catch {
        // Fallback: line-by-line key extraction if YAML parsing throws on malformed syntax
        const lines = yamlStr.split(/\r?\n/);
        for (const line of lines) {
          const keyMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
          if (keyMatch) {
            const key = keyMatch[1];
            let val = keyMatch[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            frontmatter[key] = val;
          }
        }
      }

      const id = frontmatter.id ? String(frontmatter.id) : crypto.randomUUID();
      const createdAt = frontmatter.createdAt ? String(frontmatter.createdAt) : new Date().toISOString();
      const importance = typeof frontmatter.importance === 'number'
        ? frontmatter.importance
        : (frontmatter.importance ? parseInt(String(frontmatter.importance), 10) || 1 : 1);

      let tags: string[] = [];
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(String);
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(s => s.trim()).filter(Boolean);
      }

      const scope = (frontmatter.scope !== undefined && frontmatter.scope !== null)
        ? String(frontmatter.scope)
        : undefined;

      const taskId = frontmatter.taskId !== undefined
        ? (frontmatter.taskId === null ? null : String(frontmatter.taskId))
        : undefined;

      memories.push({
        id,
        category,
        kind: category,
        content: bodyStr,
        tags,
        scope,
        importance,
        taskId,
        createdAt,
      });
    }

    return memories;
  }
```

### Verification for `src/storage/mdVectorSync.test.ts`
- Ensure `defaultConfig` in `src/storage/mdVectorSync.test.ts` retains `version: '1.0'`:
```ts
  const defaultConfig: NeuronConfig = {
    version: '1.0',
    storage: { mode: 'dual', path: storagePath },
    categories: { learning: {}, history: {}, decisions: {} },
    pullRules: { default: { minScore: 0.3, categories: ['learning'] }, onExec: [] },
  };
```

---

## 5. Verification Method

1. **Build Verification**:
   ```bash
   npm run build
   ```
   *Expected Output*: Exits with code 0 (TypeScript compilation clean).

2. **MdStorageAdapter Unit & Boundary Test Verification**:
   ```bash
   npx vitest run src/storage/mdStorageAdapter.test.ts
   ```
   *Expected Output*: 10 PASSED, 0 FAILED.

3. **MdStorageAdapter Challenger Test Verification**:
   ```bash
   npx vitest run src/storage/mdStorageAdapter.challenger.test.ts
   ```
   *Expected Output*: 20 PASSED, 0 FAILED.

4. **Full Test Suite Verification**:
   ```bash
   npm test
   ```
   *Expected Output*: All unit and integration test files pass with 100% clean exit code.

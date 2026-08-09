import { describe, it, expect } from 'vitest';
import { compressArchitectureCard } from './compressCard.js';

function fakeCard(moduleCount: number, filesPerModule: number): string {
  const header = `# 🏛️ Repository Architectural Blueprint: fake-project

## 🚀 System Purpose & Tech Stack
fake-project is a nodejs, typescript software system structured into ${moduleCount} primary architectural modules.

## 🧾 Dependency Contract
- \`zod\`

## 🔗 Subsystem Dependency Map
\`\`\`text
fake-project
${Array.from({ length: moduleCount }, (_, i) => `├── mod${i} (src/mod${i})`).join('\n')}
\`\`\`

## 📦 Primary Subsystems & Module Boundaries
`;
  const modules = Array.from({ length: moduleCount }, (_, i) => {
    const files = Array.from(
      { length: filesPerModule },
      (_, j) =>
        `- **\`src/mod${i}/file${j}.ts\`** (Exports: \`Thing${j}\`): A long-winded prose description that exists only to pad this fixture file out to a realistic size, repeated for every file in every module so the whole card comfortably exceeds any small test budget.`
    ).join('\n');
    return `\n### 🧩 mod${i} (\`src/mod${i}\`)\nPrimary mod${i} module.\n\n**Key Components & Export Contracts:**\n${files}\n`;
  }).join('');

  return header + modules;
}

describe('compressArchitectureCard', () => {
  it('returns the input unchanged when it already fits the cap', () => {
    const card = fakeCard(1, 1);
    expect(compressArchitectureCard(card, card.length + 100)).toBe(card);
  });

  it('strips purpose text but keeps every module and file when that alone fits', () => {
    const card = fakeCard(2, 2);
    // Purpose-stripped rendering is much shorter than the original but the
    // original doesn't fit — pick a cap between the two.
    const compressed = compressArchitectureCard(card, 1200);
    expect(compressed.length).toBeLessThanOrEqual(1200);
    expect(compressed).toContain('mod0');
    expect(compressed).toContain('mod1');
    expect(compressed).toContain('file0.ts');
    expect(compressed).toContain('file1.ts');
    expect(compressed).not.toContain('long-winded prose');
    expect(compressed).not.toContain('Omitted');
  });

  it('keeps file + Exports for every file that survives, dropping only the prose', () => {
    const card = fakeCard(1, 3);
    const compressed = compressArchitectureCard(card, 1000);
    expect(compressed).toContain('- **`src/mod0/file0.ts`** (Exports: `Thing0`)');
    expect(compressed).not.toContain('long-winded prose');
  });

  it('never silently drops content: a cut always carries a visible note', () => {
    const card = fakeCard(10, 20);
    const compressed = compressArchitectureCard(card, 2000);
    expect(compressed.length).toBeLessThanOrEqual(2000);
    expect(compressed).toContain('Omitted to fit the injection budget');
    // At least the earliest modules should have made it in whole.
    expect(compressed).toContain('mod0');
  });

  it('omits later whole modules before truncating an earlier one, and says how many', () => {
    const card = fakeCard(5, 15);
    const compressed = compressArchitectureCard(card, 2500);
    expect(compressed).toMatch(/\d+ more subsystem\(s\) entirely/);
  });

  it('degrades to a marked hard truncation when there are no recognizable module headings at all', () => {
    const unstructured = 'X'.repeat(20000);
    const compressed = compressArchitectureCard(unstructured, 500);
    expect(compressed.length).toBeLessThanOrEqual(500);
    expect(compressed).toContain('...[truncated]');
  });

  it('respects a zero or negative cap by returning empty', () => {
    expect(compressArchitectureCard(fakeCard(1, 1), 0)).toBe('');
    expect(compressArchitectureCard(fakeCard(1, 1), -5)).toBe('');
  });

  it('is deterministic: same input and cap produce byte-identical output', () => {
    const card = fakeCard(6, 10);
    const a = compressArchitectureCard(card, 3000);
    const b = compressArchitectureCard(card, 3000);
    expect(a).toBe(b);
  });

  it('never exceeds the cap even including the omission note', () => {
    const card = fakeCard(8, 25);
    for (const cap of [300, 800, 1500, 3000, 5000]) {
      const compressed = compressArchitectureCard(card, cap);
      expect(compressed.length).toBeLessThanOrEqual(cap);
    }
  });
});

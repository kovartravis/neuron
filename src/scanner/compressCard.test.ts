import { describe, it, expect } from 'vitest';
import { compressArchitectureCard } from './compressCard.js';

function fakeIndex(moduleCount: number): string {
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

## 📦 Primary Subsystems
`;
  const moduleLines = Array.from(
    { length: moduleCount },
    (_, i) => `- **mod${i}** — \`src/mod${i}\` (3 files)`
  ).join('\n');

  return header + moduleLines + '\n';
}

describe('compressArchitectureCard', () => {
  it('returns the input unchanged when it already fits the cap', () => {
    const card = fakeIndex(3);
    expect(compressArchitectureCard(card, card.length + 100)).toBe(card);
  });

  it('never cuts a module line in half: each surviving line is a complete line, and some are omitted', () => {
    const card = fakeIndex(15); // header 620 chars, total 1141
    const compressed = compressArchitectureCard(card, 900);
    let matched = 0;
    for (const line of compressed.split('\n')) {
      if (line.startsWith('- **mod')) {
        expect(line).toMatch(/^- \*\*mod\d+\*\* — `src\/mod\d+` \(3 files\)$/);
        matched += 1;
      }
    }
    expect(matched).toBeGreaterThan(0);
    expect(matched).toBeLessThan(15);
    expect(compressed).toMatch(/\d+ more subsystem\(s\)/);
  });

  it('never silently drops content: a cut always carries a visible note naming how many were omitted', () => {
    const card = fakeIndex(30); // header 950 chars, total 2011
    const compressed = compressArchitectureCard(card, 1400);
    expect(compressed.length).toBeLessThanOrEqual(1400);
    expect(compressed).toMatch(/\d+ more subsystem\(s\)/);
  });

  it('degrades to a marked hard truncation when there is no recognizable module list heading at all', () => {
    const unstructured = 'X'.repeat(20000);
    const compressed = compressArchitectureCard(unstructured, 500);
    expect(compressed.length).toBeLessThanOrEqual(500);
    expect(compressed).toContain('...[truncated]');
  });

  it('degrades to a marked hard truncation when even the header alone exceeds the cap', () => {
    const card = fakeIndex(500); // huge dependency-map/module-count header
    const compressed = compressArchitectureCard(card, 50);
    expect(compressed.length).toBeLessThanOrEqual(50);
    expect(compressed).toContain('...[truncated]');
  });

  it('respects a zero or negative cap by returning empty', () => {
    expect(compressArchitectureCard(fakeIndex(3), 0)).toBe('');
    expect(compressArchitectureCard(fakeIndex(3), -5)).toBe('');
  });

  it('is deterministic: same input and cap produce byte-identical output', () => {
    const card = fakeIndex(30);
    const a = compressArchitectureCard(card, 900);
    const b = compressArchitectureCard(card, 900);
    expect(a).toBe(b);
  });

  it('never exceeds the cap even including the omission note', () => {
    const card = fakeIndex(100);
    for (const cap of [100, 300, 800, 1500, 3000]) {
      const compressed = compressArchitectureCard(card, cap);
      expect(compressed.length).toBeLessThanOrEqual(cap);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { stripKnownTemplates } from './templateFingerprint.js';

describe('stripKnownTemplates (Ticket 6 / Ticket 10, neuron-2.4.2)', () => {
  it('strips the architecture module-card heading and generic fallback purpose, leaving the differing components', () => {
    const a =
      '### 🧩 widgets (`src/widgets`)\n' +
      'Primary widgets module containing core application capabilities.\n\n' +
      '**Key Components & Export Contracts:**\n' +
      '- **`src/widgets/button.ts`** (Exports: `Button`): Class Button (Methods: render()).';
    const b =
      '### 🧩 gadgets (`src/gadgets`)\n' +
      'Primary gadgets module containing core application capabilities.\n\n' +
      '**Key Components & Export Contracts:**\n' +
      '- **`src/gadgets/dial.ts`** (Exports: `Dial`): Class Dial (Methods: turn()).';

    const strippedA = stripKnownTemplates(a);
    const strippedB = stripKnownTemplates(b);

    expect(strippedA).not.toContain('Primary widgets module');
    expect(strippedA).not.toContain('🧩');
    expect(strippedA).toContain('Button');
    expect(strippedB).toContain('Dial');
    expect(strippedA).not.toBe(strippedB);
  });

  it('strips the wayfinder-pickup narrative opener in each of its observed phrasings', () => {
    const variants = [
      'Wayfinder pickup on Map — neuron 2.4.2: claimed and resolved Ticket 12.',
      'Wayfinder pickup on the neuron-2.4.2 map: claimed and resolved Ticket 7.',
      'Wayfinder pickup session on the neuron-2.4.0 map: resolved ticket 39.',
      'wayfinder(neuron-2.4.0): resolved ticket 44 (schema-migration race).',
    ];
    const expected = [
      'claimed and resolved Ticket 12.',
      'claimed and resolved Ticket 7.',
      'resolved ticket 39.',
      'resolved ticket 44 (schema-migration race).',
    ];
    variants.forEach((v, i) => expect(stripKnownTemplates(v)).toBe(expected[i]));
  });

  it('leaves content with no known template untouched', () => {
    const content = 'Maintainer decision, after ticket 24: ticket 25 is pushed off entirely for now.';
    expect(stripKnownTemplates(content)).toBe(content);
  });

  it('is idempotent — stripping already-stripped content is a no-op', () => {
    const content = 'Wayfinder pickup on Map — neuron 2.4.2: claimed ticket 6.';
    const once = stripKnownTemplates(content);
    expect(stripKnownTemplates(once)).toBe(once);
  });
});

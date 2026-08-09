/**
 * Deterministic text-grading helpers shared by every token-ab task set
 * (ticket 10's tasks.mjs, ticket 14's gitlog-tasks.mjs). No LLM judge
 * anywhere, per ticket 10's own Context section.
 */

export function containsAll(text, patterns) {
  return patterns.every(p => (p instanceof RegExp ? p.test(text) : text.includes(p)));
}

export function containsAny(text, patterns) {
  return patterns.some(p => (p instanceof RegExp ? p.test(text) : text.includes(p)));
}

// A first pass at this harness graded "this is *not* intentional design" as
// saying "intentional" — a plain substring match doesn't see the negation
// a few words earlier. This checks a window before each occurrence of
// `keyword` for a negator, and only counts the occurrence if none is found.
// It is a heuristic, not real negation detection (ticket 08's own dedupe
// research found that reliably — via a 0.5B model or an embedder — is a
// hard, mostly-unsolved problem); it exists to catch the common case this
// harness actually hit, not to be a general solution.
function isNegatedAt(text, index, window = 25) {
  const preceding = text.slice(Math.max(0, index - window), index);
  // "not a bug"/"not the bug" etc: allow one intervening article between the
  // negator and the keyword, and recognise "rather than a bug" as
  // contrastive negation — both found 2026-08-08 re-grading ticket 18's
  // rerun, where the plain adjacency check missed "deliberate, not a bug to
  // be fixed" and "a design choice ... rather than a bug awaiting a fix".
  return /\b(not|isn't|wasn't|weren't|doesn't|didn't|never|without|no|rather\s+than)\b(\s+(a|an|the))?[^a-z]*$/i.test(
    preceding
  );
}

export function hasUnnegatedKeyword(text, keyword) {
  if (keyword instanceof RegExp) {
    const re = new RegExp(keyword.source, keyword.flags.includes('g') ? keyword.flags : `${keyword.flags}g`);
    let m;
    while ((m = re.exec(text))) {
      if (!isNegatedAt(text, m.index)) return true;
      if (m.index === re.lastIndex) re.lastIndex += 1; // avoid infinite loop on zero-width matches
    }
    return false;
  }
  let idx = text.indexOf(keyword);
  while (idx !== -1) {
    if (!isNegatedAt(text, idx)) return true;
    idx = text.indexOf(keyword, idx + 1);
  }
  return false;
}

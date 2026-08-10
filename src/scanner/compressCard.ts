/**
 * Compresses the architecture *index* (ticket 28's small, always-injectable
 * card — module list only, no per-file detail) down to a target character
 * budget for injection, without touching the stored index `neuron scan
 * --diff` reads.
 *
 * Ticket 30: this used to compress the old monolithic card (ticket 27),
 * which needed real machinery to structurally degrade per-module per-file
 * detail. Post-28, the stored card fetched here *is* the index — there's no
 * per-file detail left in it to strip, only a header (purpose, dependency
 * contract, subsystem map) and one line per module. So compression is now
 * just: keep the header whole, then keep as many whole module-list lines as
 * fit, never cutting a line in half. Real measurement on this repo (14
 * modules, ~1.6KB) shows the index uses ~27% of the 6,000-char injection
 * budget, so this path is rarely exercised — but per-module-line growth is
 * only ~40 bytes/module here, and the header itself grows with the
 * dependency list, so a much larger repo can still exceed the budget. The
 * "never cut silently" discipline (25/26/27) carries forward: a cut always
 * reserves room for a note before laying out anything, so it's never dropped
 * for lack of space.
 */

const MODULE_LIST_HEADING = '## 📦 Primary Subsystems';
const CUT_MARKER = '\n...[truncated]';

// Sized for the worst case: "999 more subsystem(s)" is well under 130 chars;
// kept clear of that so the note is never itself the thing that gets cut.
const OMISSION_NOTE_RESERVE = 160;

export function compressArchitectureCard(indexMarkdown: string, cap: number): string {
  if (cap <= 0) return '';
  if (indexMarkdown.length <= cap) return indexMarkdown;

  const lines = indexMarkdown.split('\n');
  const headingIdx = lines.findIndex(l => l.trim() === MODULE_LIST_HEADING);

  if (headingIdx === -1) {
    // Not the shape this function knows how to compress structurally (no
    // recognizable module list) — fall back to a marked hard truncation
    // rather than silently dropping the card.
    return indexMarkdown.slice(0, Math.max(0, cap - CUT_MARKER.length)) + CUT_MARKER;
  }

  const header = lines.slice(0, headingIdx + 1).join('\n');
  const moduleLines = lines.slice(headingIdx + 1).filter(l => l.trim().length > 0);

  if (header.length > cap) {
    // Header alone exhausts the budget — nothing left for any module line.
    return header.slice(0, Math.max(0, cap - CUT_MARKER.length)) + CUT_MARKER;
  }

  const budget = Math.max(0, cap - OMISSION_NOTE_RESERVE);
  const parts = [header];
  let used = header.length;
  let included = 0;

  for (const line of moduleLines) {
    const lineCost = line.length + 1; // + newline
    if (used + lineCost > budget) break;
    parts.push(line);
    used += lineCost;
    included += 1;
  }

  const omitted = moduleLines.length - included;
  if (omitted > 0) {
    parts.push(
      `_(Omitted to fit the injection budget: ${omitted} more subsystem(s) — see the full index and each module's own card in \`.neuron/\`.)_`
    );
  }

  const result = parts.join('\n');
  return result.length <= cap ? result : result.slice(0, cap);
}

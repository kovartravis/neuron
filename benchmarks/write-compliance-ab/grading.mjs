/**
 * Deterministic tool-call grading for ticket 4 (neuron-2.4.3): did the
 * session actually invoke `neuron memory add`, as opposed to merely
 * describing an intent to? Mirrors src/harnesses/hintFollowLog.ts's
 * `recordToolUse` anchoring + quote-awareness verbatim (same false
 * positives that module documents were re-derived by hand here before
 * this file existed, so this reuses the fix rather than re-discovering
 * it): a bare substring match on "neuron memory add" trips on a quoted
 * echo of the phrase, or on the phrase appearing inside another command's
 * own quoted string argument (e.g. a `git commit -m "..."` message that
 * happens to mention it).
 */

const ADD_COMMAND_PATTERN = /(^|[;&|\n(`]\s*)neuron\s+memory\s+add(\s|$)/g;

function isInsideQuotes(command, index) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < index; i++) {
    const c = command[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle && command[i - 1] !== '\\') inDouble = !inDouble;
  }
  return inSingle || inDouble;
}

/** True when `command` is a real, top-level `neuron memory add` invocation — not quoted, not mentioned in prose. */
export function isMemoryAddInvocation(command) {
  ADD_COMMAND_PATTERN.lastIndex = 0;
  let match;
  while ((match = ADD_COMMAND_PATTERN.exec(command)) !== null) {
    if (!isInsideQuotes(command, match.index)) return true;
  }
  return false;
}

/** Scans every bash command issued during a session; true if any one of them was a real `neuron memory add` call. */
export function sessionCalledMemoryAdd(bashCommands) {
  return bashCommands.some(isMemoryAddInvocation);
}

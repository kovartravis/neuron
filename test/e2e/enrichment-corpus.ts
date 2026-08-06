/**
 * The polarized corpus for the enrichment pillar.
 *
 * Discrimination is measured against entries that are unambiguous at both ends,
 * so the corpus design supplies the labels and no human labelling session is
 * required. There is deliberately no middle tier: whether a "4" is objectively
 * a 4 is out of scope, but whether a note about irreversible data loss outranks
 * a note about tab width is not a judgement call.
 */

export type ImportanceLabel = 'critical' | 'trivial';

export interface LabelledEntry {
  id: string;
  content: string;
  label: ImportanceLabel;
}

/**
 * Entries a maintainer would consider unrecoverable if deleted. The hard
 * assertion of the pillar is that none of these ever lands in a prune's delete
 * set at the default threshold.
 */
export const CRITICAL_ENTRIES: LabelledEntry[] = [
  {
    id: 'crit-prod-dataloss',
    content:
      'Never run the 0.4.x migration against production: it drops the memories table before recreating it, so every entry written since the last backup is lost permanently. Restore from the nightly snapshot is the only recovery.',
    label: 'critical',
  },
  {
    id: 'crit-credentials',
    content:
      'The publish token for the npm registry lives in the maintainer 1Password vault under "neuron release". It is the only copy; rotating it requires re-enrolling two-factor auth and invalidates every CI job until the secret is updated.',
    label: 'critical',
  },
  {
    id: 'crit-corruption',
    content:
      'Killing a neuron process mid-write leaves stale SQLite WAL sidecars, and the next prepare() dies with "disk I/O error". Recovery requires unlinking the .sqlite, the -wal AND the -shm file; deleting only the .sqlite leaves the store permanently unopenable.',
    label: 'critical',
  },
  {
    id: 'crit-security',
    content:
      'Grammar tarballs are fetched over TLS with pinned versions but their dist.integrity checksum is never verified, so a compromised registry mirror can serve an arbitrary parser that runs against every source file in the repository.',
    label: 'critical',
  },
  {
    id: 'crit-irreversible',
    content:
      'The consolidation dedupe marks losing entries superseded rather than deleting them precisely because a wrong pick must be a flag flip to undo. Never change it to a delete: the wording of a superseded entry is not recoverable from its survivor.',
    label: 'critical',
  },
  {
    id: 'crit-release-block',
    content:
      'A release must never be published while the adversarial retrieval pillar is worse than the previous run. A recall regression shipped to users is invisible until someone notices their memory store stopped answering, which can be months.',
    label: 'critical',
  },
];

/** Entries whose loss costs nothing — the other end of the scale. */
export const TRIVIAL_ENTRIES: LabelledEntry[] = [
  {
    id: 'triv-formatting',
    content:
      'The help text box drawing uses a two-space inner pad on each side. This is purely cosmetic and nobody has ever commented on it.',
    label: 'trivial',
  },
  {
    id: 'triv-naming',
    content:
      'Renamed a local variable from `res` to `result` in one branch of the status command for readability. No behaviour changed.',
    label: 'trivial',
  },
  {
    id: 'triv-typo',
    content:
      'Fixed a typo in a code comment: "recieved" to "received". No functional impact of any kind.',
    label: 'trivial',
  },
  {
    id: 'triv-log-wording',
    content:
      'Reworded a debug log line from "starting scan" to "scan starting" so it sorts next to the other scan lines when grepping.',
    label: 'trivial',
  },
  {
    id: 'triv-whitespace',
    content:
      'Removed a stray blank line at the end of the fixtures directory README. Whitespace only.',
    label: 'trivial',
  },
  {
    id: 'triv-emoji',
    content:
      'Swapped the emoji in one section heading of the generated blueprint card from a package box to a puzzle piece because it looked slightly better.',
    label: 'trivial',
  },
];

export const LABELLED_ENTRIES: LabelledEntry[] = [...CRITICAL_ENTRIES, ...TRIVIAL_ENTRIES];

/**
 * Category-labelled entries for the strategy A/B. `learning` and `decisions`
 * are semantically adjacent, which is where centroid cosine is weakest and
 * where a prompt can use the `description` fields as instructions — so the
 * comparison lives or dies on exactly these two.
 */
export interface CategoryCase {
  id: string;
  content: string;
  expected: string;
}

export const CATEGORY_CASES: CategoryCase[] = [
  {
    id: 'cat-learning-1',
    content:
      'When a build fails with "Cannot find module dist/cli.js", the fix is to run npm run build before the test suite; vitest does not build for you.',
    expected: 'learning',
  },
  {
    id: 'cat-learning-2',
    content:
      'Always pass the argv array to spawnSync rather than joining it into a string, or any argument containing a space is silently word-split by the shell.',
    expected: 'learning',
  },
  {
    id: 'cat-learning-3',
    content:
      'Rule: relink the global install with npm link before verifying a release, otherwise the verification measures the previously published version.',
    expected: 'learning',
  },
  {
    id: 'cat-history-1',
    content:
      'Completed the tree-sitter grammar acquisition ticket today: added the fetch step to neuron init, wired the cache directory, and closed the issue.',
    expected: 'history',
  },
  {
    id: 'cat-history-2',
    content:
      'Ran the full benchmark suite this afternoon; all ten pillars executed and the scorecard was written to benchmarks/reports.',
    expected: 'history',
  },
  {
    id: 'cat-history-3',
    content:
      'Session summary: reviewed the open tickets, cut the release candidate, tagged it, and pushed the tag to the remote.',
    expected: 'history',
  },
  {
    id: 'cat-decisions-1',
    content:
      'We chose to fetch grammars at init time rather than bundling them in the tarball, because bundling eight grammars would take the package from 621KB to roughly 20MB.',
    expected: 'decisions',
  },
  {
    id: 'cat-decisions-2',
    content:
      'MCP was rejected on the merits rather than on cost: MCP exposes tools the agent chooses to call, which is the same reliability failure as an instruction, relocated.',
    expected: 'decisions',
  },
  {
    id: 'cat-decisions-3',
    content:
      'Architectural decision: hooks own the read side of the protocol while the agent keeps the write side, because deciding what is worth recording is editorial judgement.',
    expected: 'decisions',
  },
];

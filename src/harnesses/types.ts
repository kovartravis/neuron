/**
 * The recall adapter interface, per ADR 0014 / ticket 11.
 *
 * Capability is a per-lifecycle-point map, not a single enum: two harnesses
 * can occupy the same `deterministic`/`best-effort` label while differing on
 * exactly what they leave undocumented. The enum is derived for display only
 * (`neuron init` output, the README matrix) and is never itself stored —
 * see `deriveFidelity` below.
 */

/**
 * Neuron's own lifecycle vocabulary. Each adapter translates these into its
 * harness's native event names.
 *
 * - `session-start` fires once per session; carries the architecture card.
 * - `pre-prompt` fires before every turn reaches the model; carries query
 *   results, deduplicated by the session ledger.
 * - `context-reset` is execution-only (ADR 0014 §5): it never injects
 *   anything, it only has to *run*, to clear the session ledger before a
 *   compaction event makes it lie about what is still in context.
 */
export type LifecyclePoint = 'session-start' | 'pre-prompt' | 'context-reset';

export const LIFECYCLE_POINTS: readonly LifecyclePoint[] = ['session-start', 'pre-prompt', 'context-reset'];

/**
 * What a harness does at one lifecycle point. `'unknown'` is a first-class
 * value distinct from both a known value and "no" — an undocumented payload
 * cap is not the same fact as no cap, and a type that cannot express that
 * difference cannot let the code explain its own scope decisions honestly
 * (ADR 0014 §2).
 */
export interface SupportRecord {
  /** Whether output at this point actually reaches the model's context. */
  injects: boolean | 'unknown';
  /** Documented payload cap for this point, in characters, or 'unknown'. */
  payloadCapChars: number | 'unknown';
  /** What happens when the hook errors, hangs, or times out. */
  failurePosture: 'fail-open' | 'fail-closed' | 'unknown';
  /** Documented timeout in milliseconds, or 'unknown'. */
  timeoutMs: number | 'unknown';
  /** Free-text caveats that don't fit the fields above. */
  caveats?: string[];
}

export type CapabilityMap = Record<LifecyclePoint, SupportRecord>;

/** Display-only label, derived from a capability map — never stored. */
export type FidelityLabel = 'deterministic' | 'best-effort' | 'instruction-only';

/**
 * `deterministic` requires every point to inject with a known payload cap,
 * known failure posture and known timeout. Anything less honest — even one
 * `'unknown'` — is `best-effort`. A harness with no injecting point at all is
 * `instruction-only`.
 */
export function deriveFidelity(capability: CapabilityMap): FidelityLabel {
  const records = LIFECYCLE_POINTS.map(point => capability[point]);
  const anyInjects = records.some(r => r.injects === true);
  if (!anyInjects) return 'instruction-only';
  const allFullyKnown = records
    .filter(r => r.injects === true)
    .every(r => r.payloadCapChars !== 'unknown' && r.failurePosture !== 'unknown' && r.timeoutMs !== 'unknown');
  return allFullyKnown ? 'deterministic' : 'best-effort';
}

/** Where `neuron init` writes a harness's hook configuration. */
export type HookTarget = 'user-global' | 'project-committed' | 'project-local';

export type OverwritePolicy = 'ask' | 'keep' | 'overwrite';

export interface InstallOptions {
  target: HookTarget;
  /**
   * Governs only the case where a *neuron-authored* entry already exists and
   * differs from what this run would write (e.g. an older version's args).
   * Never asked about a user's own, non-neuron hooks — those are left alone
   * unconditionally. Defaults to `'ask'`; a non-interactive caller (e.g. CI)
   * should pass `'keep'` or `'overwrite'` explicitly.
   */
  overwrite?: OverwritePolicy;
  /**
   * Invoked only when `overwrite === 'ask'` and a conflicting neuron entry is
   * found. Resolves `true` to overwrite, `false` to keep the existing entry.
   * Callers without a TTY should not pass `'ask'` in the first place.
   */
  onConflict?: (info: { targetPath: string; point: LifecyclePoint }) => Promise<boolean> | boolean;
}

export interface InstallResult {
  harness: string;
  targetPath: string;
  target: HookTarget;
  /** Per lifecycle point: what happened to that point's hook entry. */
  points: Record<LifecyclePoint, 'written' | 'unchanged' | 'kept-existing'>;
}

export interface UninstallResult {
  harness: string;
  /** Every config file inspected, and how many of neuron's own entries were removed from each. */
  removed: Array<{ targetPath: string; removedCount: number }>;
}

export interface VerifyPointStatus {
  /** Whether a neuron-authored entry is present in a config file neuron can read. */
  registered: boolean;
  targetPath?: string;
  /**
   * Firing is evidence, not inference from file contents: it comes from the
   * hook's own runtime writing a timestamp the moment it executes, which is
   * the only way to know a registered hook is actually being invoked — no
   * harness researched (ticket 10) documents an external way to confirm this.
   */
  lastFiredAt?: string;
  fireCount: number;
}

export type VerifyResult = Record<LifecyclePoint, VerifyPointStatus>;

/**
 * What a harness adapter implements. `install`/`uninstall`/`verify` all take
 * a plain project directory rather than a `NeuronMemory` instance — they only
 * ever touch harness config files, never the memory store itself.
 */
export interface HarnessAdapter {
  readonly id: string;
  /** Whether this harness's marker (e.g. `.claude/`) is present in the project. */
  detect(projectDir: string): boolean;
  /** The truthful, per-point capability record this adapter is prepared to honour. */
  capability(): CapabilityMap;
  install(projectDir: string, options: InstallOptions): Promise<InstallResult>;
  uninstall(projectDir: string): Promise<UninstallResult>;
  verify(projectDir: string): VerifyResult;
}

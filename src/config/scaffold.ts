import fs from 'node:fs';
import path from 'node:path';
import { findNeuronYaml } from './neuronYaml.js';

/**
 * The config `neuron init` writes when a project has none (ticket 31).
 *
 * Two rules govern what may appear here:
 *
 * 1. **Every key is one the schema actually reads.** An aspirational key in a
 *    generated file is worse than an undocumented one — it looks configured and
 *    does nothing. `llm.enrichment.importance` is the cautionary example: it was
 *    removed by ticket 26, and Zod silently strips it, so a template carrying it
 *    would advertise a setting that cannot take effect. `pullRules.default.minScore`
 *    is the same trap in a louder form: ticket 39 deprecated it (it cannot reject
 *    a top hit at any relevance, ADR 0012) and every command now warns on stderr
 *    when it's present — a template carrying it would make a fresh `neuron init`
 *    noisy on its very first run.
 * 2. **`architecture` is declared even though `scan.enabled` is `false`.**
 *    `scan.category` defaults to `architecture`, so a config that sets up the
 *    scan without declaring the category it writes into leaves those entries
 *    outside `categories` — which in `md` mode means the reconcile pass never
 *    covers them. Declaring it costs one no-op reconcile per command and
 *    removes the trap for anyone who later flips `enabled: true`.
 * 3. **Nothing here turns on behaviour the schema defaults leave off.**
 *    `scan.enabled` stays `false`, matching a config-less project, so generating
 *    this file changes what a project *says* rather than what it does. An `init`
 *    that quietly started scanning — loading the summarizer and filing a
 *    blueprint card nobody asked for — would be a behaviour change disguised as
 *    a convenience. The pull rules are the one place the template is opinionated
 *    rather than default, and they are opinionated *in the file*, where the user
 *    can read and change them.
 *
 * The `llm` block is deliberately omitted. Its defaults are the values ticket
 * 06's A/B selected on evidence (`categoryStrategy: centroid`, 9/9 against the
 * model's 1/9); pinning them into every generated file would freeze a measured
 * result as a user setting and make future corrections invisible.
 */
export const NEURON_YAML_TEMPLATE = `version: "1.0"

# Your memory lives in markdown. SQLite is kept as a rebuildable index that is
# reconciled from these files on every command — the .md files are the record.
#   md          markdown is authoritative, vector index derived from it
#   vector-only local SQLite vector DB with FTS5 only, no .md files
#   split       per-category routing (see categories.*.storage below)
storage:
  mode: md
  path: .neuron

categories:
  learning:
    description: Agent conventions, rules, and failure fixes
    tags: [rule, convention, failure-fix]

  history:
    description: Action history log and completed task summary
    tags: [task, history]

  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    tags: [adr, architecture, design]

  architecture:
    description: Architectural blueprints & structure cards
    tags: [architecture, topology, scan]

# Set enabled: true to scan on init and to surface drift in
# 'neuron status' and 'neuron exec'. Writes into the category named below,
# which must be one of the categories declared above.
scan:
  enabled: false
  category: architecture
  depth: 3

pullRules:
  default:
    categories: [learning, decisions]
    limit: 5

  onExec:
    - commandPattern: ".*"
      categories: [learning]
      limit: 5
`;

export interface ScaffoldResult {
  /** Absolute path to the config governing this project, written or not. */
  path: string;
  /** True only when this call created the file. */
  created: boolean;
}

/**
 * Write a default `neuron.yaml` for a project that has none.
 *
 * An existing config is **never** touched, rewritten or merged into — not even
 * to add keys it is missing. `neuron init` is re-run routinely (to refresh
 * skills, models and grammars), so anything it edits it will edit again over a
 * user's hand-tuning. Detection reuses `findNeuronYaml`, so a config in an
 * ancestor directory that already governs this project counts as present: the
 * alternative is writing a second file that silently shadows the first.
 */
export function scaffoldNeuronYaml(projectDir: string): ScaffoldResult {
  const existing = findNeuronYaml(projectDir);
  if (existing) {
    return { path: existing, created: false };
  }

  const target = path.join(projectDir, 'neuron.yaml');
  fs.writeFileSync(target, NEURON_YAML_TEMPLATE, 'utf8');
  return { path: target, created: true };
}

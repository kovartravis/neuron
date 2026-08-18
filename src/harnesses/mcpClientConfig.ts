import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HookTarget, OverwritePolicy } from './types.js';

/**
 * Ticket 9 (neuron-2.4.3, "MCP Server & Setup/Onboarding Skill Split"):
 * implements Ticket 8's decision 4 — `neuron init` writes each detected
 * client's `mcpServers` stanza directly, using the exact same
 * `--overwrite-hooks`/`--keep-hooks` ask-on-conflict posture as the hook
 * adapters (ADR 0014 §7), not a second policy invented for MCP.
 *
 * This is deliberately a separate, parallel surface from `HarnessAdapter`
 * (`types.ts`): a hook adapter answers "how does this harness receive a
 * per-turn recall event," while this module answers "where does this
 * harness's *editor* look for an MCP server to spawn" — an unrelated config
 * file, present or absent independently of whether a hook adapter exists.
 * `agents` (the generic AGENTS.md-fallback harness) has no entry here for
 * the same reason it has no `HarnessAdapter`: there is no single MCP-config
 * product to target for a convention shared by many unrelated tools, not one
 * product with one config surface (Ticket 9's own scope note).
 *
 * Every path below was verified against each vendor's own current docs
 * during this ticket (not carried over unverified from Ticket 8's Answer,
 * which named them from general knowledge only):
 *
 * - Claude Code (`code.claude.com/docs/en/mcp`, fetched directly): three
 *   scopes, `project` → `.mcp.json` at the project root; `local` and `user`
 *   both → `~/.claude.json`, at `projects["<absolute project path>"].mcpServers`
 *   for `local`, and top-level `mcpServers` for `user`.
 * - Cursor (`cursor.com/docs/mcp`, fetched directly): `.cursor/mcp.json`
 *   (project) / `~/.cursor/mcp.json` (user), both top-level `mcpServers`. No
 *   third, gitignored, project-local scope is documented — same gap the
 *   Cursor hook adapter's own `targetFilePath` already has for hooks.
 * - Codex CLI (`learn.chatgpt.com/docs/extend/mcp?surface=cli`, fetched
 *   directly): `~/.codex/config.toml` (user) / `<repo>/.codex/config.toml`
 *   (project, trusted projects only), `[mcp_servers.<name>]` TOML tables.
 *   Unlike hooks (ADR 0014 §7, which dodges TOML entirely via a sibling
 *   `hooks.json`), MCP servers have no such escape valve — the schema
 *   requires a real `mcp_servers` table inside `config.toml` itself. A
 *   general TOML round-trip (parse-mutate-restringify) would strip a user's
 *   comments and reformat their file; `toml-patch`, the one npm package
 *   found that claims comment-preserving patch semantics, was tried live and
 *   confirmed broken for inserting a *new* key (it prepends an unindented
 *   bare assignment before the whole file rather than inserting into the
 *   target table) — unusable, and reverted. Instead, `installCodex` below
 *   never parses the file as TOML at all: it finds (or appends) the
 *   line-delimited `[mcp_servers.neuron]` table by text scanning, the same
 *   marker-region-splice technique `protocolBlock.ts`'s
 *   `findMarkerRange`/`upsertProtocolBlock` already uses for Markdown — every
 *   other line in the file, comments included, is left untouched byte for
 *   byte.
 * - GitHub Copilot CLI (`docs.github.com/en/copilot/how-tos/copilot-cli/
 *   customize-copilot/add-mcp-servers`, fetched directly): corrects Ticket
 *   8's Answer, which carried forward Ticket 10's research finding of
 *   "user-level only, no project-level equivalent found." A project-level
 *   surface does exist: `.mcp.json` *or* `.github/mcp.json`, with `.mcp.json`
 *   taking precedence when both are present in the same directory. Because
 *   `.mcp.json` is also Claude Code's own project file, and Copilot CLI would
 *   silently prefer it over `.github/mcp.json` the moment it exists for any
 *   reason (including a `claude` harness sharing this repo), `github`'s
 *   project-committed/-local target is `.mcp.json` too, not `.github/mcp.json`
 *   — writing to the lower-precedence file would risk the entry being
 *   invisible to Copilot CLI whenever `.mcp.json` also exists. User-level
 *   config is `~/.copilot/mcp-config.json`, top-level `mcpServers`.
 *
 * Consequence: `claude` and `github` can resolve to the *same* target file
 * (`.mcp.json`) for `project-committed`/`project-local`. `installMcpConfig`
 * callers (`init.ts`) must dedupe by resolved `targetPath` across harnesses
 * in one run, the same way `resolveProtocolTargets` groups harnesses sharing
 * one `mdFile` — writing the identical entry into the identical file twice
 * in one run is harmless but doubles the conflict-ask prompt for no reason.
 */
export const MCP_CLIENT_HARNESS_NAMES = ['claude', 'cursor', 'codex', 'github'] as const;
export type McpClientHarnessName = (typeof MCP_CLIENT_HARNESS_NAMES)[number];

export const MCP_SERVER_NAME = 'neuron';

interface ProposedMcpServer {
  command: string;
  args: string[];
}

function proposedMcpServer(): ProposedMcpServer {
  return { command: 'npx', args: ['-y', '@kovartravis/neuron', 'mcp'] };
}

export interface McpConfigInstallOptions {
  target: HookTarget;
  overwrite?: OverwritePolicy;
  onConflict?: (info: { targetPath: string }) => Promise<boolean> | boolean;
}

export type McpConfigWriteAction = 'written' | 'unchanged' | 'kept-existing';

export interface McpConfigInstallResult {
  harness: McpClientHarnessName;
  targetPath: string;
  target: HookTarget;
  action: McpConfigWriteAction;
  warning?: string;
}

async function resolveOverwrite(
  existing: unknown,
  proposed: unknown,
  targetPath: string,
  options: McpConfigInstallOptions
): Promise<'write' | 'unchanged' | 'keep'> {
  if (JSON.stringify(existing) === JSON.stringify(proposed)) return 'unchanged';
  const policy = options.overwrite ?? 'ask';
  if (policy === 'overwrite') return 'write';
  if (policy === 'keep') return 'keep';
  if (options.onConflict) return (await options.onConflict({ targetPath })) ? 'write' : 'keep';
  return 'keep'; // 'ask' with no prompt available never clobbers silently.
}

function readJsonFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e: any) {
    throw new Error(`neuron: cannot read ${filePath}: ${e.message}`);
  }
  if (raw.trim() === '') return {};
  try {
    return JSON.parse(raw);
  } catch (e: any) {
    throw new Error(
      `neuron: ${filePath} is not valid JSON — fix or remove it by hand before running 'neuron init' again (${e.message}).`
    );
  }
}

function writeJsonFile(filePath: string, contents: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(contents, null, 2) + '\n', 'utf8');
}

/** A plain `{ mcpServers: { ... } }` JSON file — the shape every JSON-based target below shares. */
async function installIntoJsonServersFile(
  targetPath: string,
  getRoot: () => Record<string, unknown>,
  writeRoot: (root: Record<string, unknown>) => void,
  options: McpConfigInstallOptions
): Promise<McpConfigWriteAction> {
  const root = getRoot();
  const servers = (root.mcpServers && typeof root.mcpServers === 'object' ? root.mcpServers : {}) as Record<
    string,
    unknown
  >;
  const proposed = proposedMcpServer();
  const existing = servers[MCP_SERVER_NAME];

  if (existing === undefined) {
    servers[MCP_SERVER_NAME] = proposed;
    root.mcpServers = servers;
    writeRoot(root);
    return 'written';
  }

  const resolution = await resolveOverwrite(existing, proposed, targetPath, options);
  if (resolution === 'unchanged') return 'unchanged';
  if (resolution === 'keep') return 'kept-existing';

  servers[MCP_SERVER_NAME] = proposed;
  root.mcpServers = servers;
  writeRoot(root);
  return 'written';
}

// ---------------------------------------------------------------------------
// claude
// ---------------------------------------------------------------------------

function claudeUserConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

async function installClaude(projectDir: string, options: McpConfigInstallOptions): Promise<McpConfigInstallResult> {
  if (options.target === 'project-committed') {
    const targetPath = path.join(projectDir, '.mcp.json');
    const action = await installIntoJsonServersFile(
      targetPath,
      () => readJsonFile(targetPath),
      root => writeJsonFile(targetPath, root),
      options
    );
    return { harness: 'claude', targetPath, target: options.target, action };
  }

  const targetPath = claudeUserConfigPath();
  if (options.target === 'user-global') {
    const action = await installIntoJsonServersFile(
      targetPath,
      () => readJsonFile(targetPath),
      root => writeJsonFile(targetPath, root),
      options
    );
    return { harness: 'claude', targetPath, target: options.target, action };
  }

  // 'project-local': Claude Code's own "local scope" — private to this
  // project but stored in the user's home directory, not the repo.
  const absProjectDir = path.resolve(projectDir);
  const root = readJsonFile(targetPath);
  const projects = (root.projects && typeof root.projects === 'object' ? root.projects : {}) as Record<
    string,
    unknown
  >;
  const projectEntry = (
    projects[absProjectDir] && typeof projects[absProjectDir] === 'object' ? projects[absProjectDir] : {}
  ) as Record<string, unknown>;
  const servers = (
    projectEntry.mcpServers && typeof projectEntry.mcpServers === 'object' ? projectEntry.mcpServers : {}
  ) as Record<string, unknown>;
  const proposed = proposedMcpServer();
  const existing = servers[MCP_SERVER_NAME];

  let action: McpConfigWriteAction;
  if (existing === undefined) {
    action = 'written';
  } else {
    const resolution = await resolveOverwrite(existing, proposed, targetPath, options);
    action = resolution === 'unchanged' ? 'unchanged' : resolution === 'keep' ? 'kept-existing' : 'written';
  }

  if (action === 'written') {
    servers[MCP_SERVER_NAME] = proposed;
    projectEntry.mcpServers = servers;
    projects[absProjectDir] = projectEntry;
    root.projects = projects;
    writeJsonFile(targetPath, root);
  }

  return { harness: 'claude', targetPath, target: options.target, action };
}

function isClaudeConfigured(projectDir: string): boolean {
  const absProjectDir = path.resolve(projectDir);

  const projectFile = readJsonFile(path.join(projectDir, '.mcp.json'));
  const projectServers = (projectFile.mcpServers ?? {}) as Record<string, unknown>;
  if (projectServers[MCP_SERVER_NAME] !== undefined) return true;

  const userFile = readJsonFile(claudeUserConfigPath());
  const userServers = (userFile.mcpServers ?? {}) as Record<string, unknown>;
  if (userServers[MCP_SERVER_NAME] !== undefined) return true;

  const projects = (userFile.projects ?? {}) as Record<string, unknown>;
  const projectEntry = (projects[absProjectDir] ?? {}) as Record<string, unknown>;
  const localServers = (projectEntry.mcpServers ?? {}) as Record<string, unknown>;
  return localServers[MCP_SERVER_NAME] !== undefined;
}

// ---------------------------------------------------------------------------
// cursor
// ---------------------------------------------------------------------------

/** No documented gitignored project-local scope distinct from the committed one — same collapse the Cursor hook adapter already applies. */
function cursorTargetPath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.cursor', 'mcp.json');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.cursor', 'mcp.json');
  }
}

async function installCursor(projectDir: string, options: McpConfigInstallOptions): Promise<McpConfigInstallResult> {
  const targetPath = cursorTargetPath(projectDir, options.target);
  const action = await installIntoJsonServersFile(
    targetPath,
    () => readJsonFile(targetPath),
    root => writeJsonFile(targetPath, root),
    options
  );

  const warning =
    options.target === 'project-local'
      ? 'Cursor has no documented gitignored project-level MCP config scope distinct from the committed ' +
        `one — wrote to ${targetPath}, the same file 'project-committed' would use.`
      : undefined;

  return { harness: 'cursor', targetPath, target: options.target, action, warning };
}

function isCursorConfigured(projectDir: string): boolean {
  for (const targetPath of [cursorTargetPath(projectDir, 'project-committed'), cursorTargetPath(projectDir, 'user-global')]) {
    const servers = (readJsonFile(targetPath).mcpServers ?? {}) as Record<string, unknown>;
    if (servers[MCP_SERVER_NAME] !== undefined) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// codex — hand-rolled TOML table splice; see the module doc comment for why.
// ---------------------------------------------------------------------------

function codexTargetPath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.codex', 'config.toml');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.codex', 'config.toml');
  }
}

function codexTableBlock(server: ProposedMcpServer): string {
  const argsLiteral = `[${server.args.map(a => JSON.stringify(a)).join(', ')}]`;
  return `[mcp_servers.${MCP_SERVER_NAME}]\ncommand = ${JSON.stringify(server.command)}\nargs = ${argsLiteral}\n`;
}

/**
 * Finds the `[mcp_servers.neuron]` table by line scanning rather than a real
 * TOML parse — a table's own lines run from its header to the next
 * top-level-or-nested table header (`[...]`, not `[[...]]`, which TOML
 * reserves for arrays of tables neuron never writes) or EOF. Tolerates the
 * three ways a TOML author can quote the leaf key (bare `neuron`, or
 * single/double-quoted) since a hand-written conflicting entry might use
 * either; neuron itself always emits the bare form.
 */
function findCodexTableRange(content: string): { start: number; end: number } | null {
  const headerPattern = /^\[mcp_servers\.(?:neuron|"neuron"|'neuron')\]\s*$/m;
  const match = headerPattern.exec(content);
  if (!match) return null;

  const start = match.index;
  const nextHeader = /^\[[^[]/m;
  const rest = content.slice(start + match[0].length);
  const nextMatch = nextHeader.exec(rest);
  const end = nextMatch ? start + match[0].length + nextMatch.index : content.length;
  return { start, end };
}

async function installCodex(projectDir: string, options: McpConfigInstallOptions): Promise<McpConfigInstallResult> {
  const targetPath = codexTargetPath(projectDir, options.target);
  const proposed = proposedMcpServer();
  const block = codexTableBlock(proposed);

  const existingContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
  const range = findCodexTableRange(existingContent);

  let action: McpConfigWriteAction;
  let nextContent: string | null = null;

  if (!range) {
    const separator = existingContent.length === 0 || existingContent.endsWith('\n\n') ? '' : existingContent.endsWith('\n') ? '\n' : '\n\n';
    nextContent = `${existingContent}${separator}${block}`;
    action = 'written';
  } else {
    const existingBlock = existingContent.slice(range.start, range.end);
    if (existingBlock.trim() === block.trim()) {
      action = 'unchanged';
    } else {
      const policy = options.overwrite ?? 'ask';
      let shouldOverwrite: boolean;
      if (policy === 'overwrite') shouldOverwrite = true;
      else if (policy === 'keep') shouldOverwrite = false;
      else if (options.onConflict) shouldOverwrite = await options.onConflict({ targetPath });
      else shouldOverwrite = false;

      if (shouldOverwrite) {
        nextContent = existingContent.slice(0, range.start) + block + existingContent.slice(range.end);
        action = 'written';
      } else {
        action = 'kept-existing';
      }
    }
  }

  if (nextContent !== null) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, nextContent, 'utf8');
  }

  let warning: string | undefined;
  if (options.target === 'project-local') {
    warning =
      'Codex CLI has no documented gitignored project-level MCP config scope distinct from the committed ' +
      `one — wrote to ${targetPath}, the same file 'project-committed' would use.`;
  }
  if (action === 'written' && (options.target === 'project-committed' || options.target === 'project-local')) {
    const trustWarning =
      `Codex CLI only loads a project-scoped .codex/config.toml for projects marked trusted in ` +
      `~/.codex/config.toml ([projects."${path.resolve(projectDir)}"] trust_level = "trusted") — neuron does ` +
      'not set that itself. If this project is untrusted, run Codex interactively here once and accept its ' +
      'trust prompt, or the mcp_servers.neuron entry just written will be silently ignored.';
    warning = warning ? `${warning} ${trustWarning}` : trustWarning;
  }

  return { harness: 'codex', targetPath, target: options.target, action, warning };
}

function isCodexConfigured(projectDir: string): boolean {
  for (const targetPath of [codexTargetPath(projectDir, 'project-committed'), codexTargetPath(projectDir, 'user-global')]) {
    if (!fs.existsSync(targetPath)) continue;
    const content = fs.readFileSync(targetPath, 'utf8');
    if (findCodexTableRange(content)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// github (Copilot CLI)
// ---------------------------------------------------------------------------

/**
 * Project-committed/-local both resolve to `.mcp.json` — the same file
 * `claude`'s own project targets use — not `.github/mcp.json`, because
 * Copilot CLI prefers `.mcp.json` over `.github/mcp.json` whenever both
 * exist in the same directory (confirmed via direct fetch of GitHub's own
 * docs). Writing only to the lower-precedence file would risk the entry
 * being invisible to Copilot CLI the moment `.mcp.json` exists for any
 * reason, including a `claude` harness sharing this repo.
 */
function githubTargetPath(projectDir: string, target: HookTarget): string {
  switch (target) {
    case 'user-global':
      return path.join(os.homedir(), '.copilot', 'mcp-config.json');
    case 'project-committed':
    case 'project-local':
      return path.join(projectDir, '.mcp.json');
  }
}

async function installGithub(projectDir: string, options: McpConfigInstallOptions): Promise<McpConfigInstallResult> {
  const targetPath = githubTargetPath(projectDir, options.target);
  const action = await installIntoJsonServersFile(
    targetPath,
    () => readJsonFile(targetPath),
    root => writeJsonFile(targetPath, root),
    options
  );

  const warning =
    options.target === 'project-local'
      ? 'GitHub Copilot CLI has no documented gitignored project-level MCP config scope distinct from the ' +
        `committed one — wrote to ${targetPath}, the same file 'project-committed' would use.`
      : undefined;

  return { harness: 'github', targetPath, target: options.target, action, warning };
}

function isGithubConfigured(projectDir: string): boolean {
  for (const targetPath of [githubTargetPath(projectDir, 'project-committed'), githubTargetPath(projectDir, 'user-global')]) {
    const servers = (readJsonFile(targetPath).mcpServers ?? {}) as Record<string, unknown>;
    if (servers[MCP_SERVER_NAME] !== undefined) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

/** Where `installMcpConfig`/`isMcpConfigured` would resolve `target` to, without writing — used by `init.ts` to dedupe harnesses that share a file (`claude`/`github` both → `.mcp.json`). */
export function mcpTargetPath(harnessName: McpClientHarnessName, projectDir: string, target: HookTarget): string {
  switch (harnessName) {
    case 'claude':
      return target === 'project-committed' ? path.join(projectDir, '.mcp.json') : claudeUserConfigPath();
    case 'cursor':
      return cursorTargetPath(projectDir, target);
    case 'codex':
      return codexTargetPath(projectDir, target);
    case 'github':
      return githubTargetPath(projectDir, target);
  }
}

export async function installMcpConfig(
  harnessName: McpClientHarnessName,
  projectDir: string,
  options: McpConfigInstallOptions
): Promise<McpConfigInstallResult> {
  switch (harnessName) {
    case 'claude':
      return installClaude(projectDir, options);
    case 'cursor':
      return installCursor(projectDir, options);
    case 'codex':
      return installCodex(projectDir, options);
    case 'github':
      return installGithub(projectDir, options);
  }
}

/**
 * Ground truth, not this run's flags — reads every candidate scope's real
 * file, matching `resolveHarnessFidelity`'s own "ground truth" posture for
 * hooks. A server configured by an earlier `init` run, or one this run
 * declined to overwrite, still counts as configured.
 */
export function isMcpConfigured(harnessName: McpClientHarnessName, projectDir: string): boolean {
  switch (harnessName) {
    case 'claude':
      return isClaudeConfigured(projectDir);
    case 'cursor':
      return isCursorConfigured(projectDir);
    case 'codex':
      return isCodexConfigured(projectDir);
    case 'github':
      return isGithubConfigured(projectDir);
  }
}

export function isMcpClientHarnessName(name: string): name is McpClientHarnessName {
  return (MCP_CLIENT_HARNESS_NAMES as readonly string[]).includes(name);
}

import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { installMcpConfig, isMcpConfigured, mcpTargetPath, MCP_SERVER_NAME } from './mcpClientConfig.js';

describe('mcpClientConfig (src/harnesses/mcpClientConfig.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-mcp-client-config');
  let projectDir: string;

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const proposedServer = { command: 'npx', args: ['-y', '@kovartravis/neuron', 'mcp'] };

  describe('claude', () => {
    const mcpJsonPath = () => path.join(projectDir, '.mcp.json');

    it('writes a fresh mcpServers.neuron entry into .mcp.json for project-committed', async () => {
      const result = await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      expect(result.action).toBe('written');
      expect(result.targetPath).toBe(mcpJsonPath());

      const file = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      expect(file.mcpServers.neuron).toEqual(proposedServer);
    });

    it('is idempotent: a second install with identical content reports unchanged', async () => {
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      const second = await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      expect(second.action).toBe('unchanged');
    });

    it('never touches a user\'s own other mcpServers entries or keys', async () => {
      fs.writeFileSync(
        mcpJsonPath(),
        JSON.stringify({ someOtherSetting: true, mcpServers: { stripe: { type: 'http', url: 'https://mcp.stripe.com' } } })
      );
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });

      const file = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      expect(file.someOtherSetting).toBe(true);
      expect(file.mcpServers.stripe).toEqual({ type: 'http', url: 'https://mcp.stripe.com' });
      expect(file.mcpServers.neuron).toEqual(proposedServer);
    });

    it('keeps a conflicting neuron entry by default under the "ask" policy with no prompt available', async () => {
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      const file = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      file.mcpServers.neuron.args = ['old-args'];
      fs.writeFileSync(mcpJsonPath(), JSON.stringify(file));

      const result = await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      expect(result.action).toBe('kept-existing');
      const after = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      expect(after.mcpServers.neuron.args).toEqual(['old-args']);
    });

    it('overwrites a conflicting neuron entry when the overwrite policy says so', async () => {
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      const file = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      file.mcpServers.neuron.args = ['old-args'];
      fs.writeFileSync(mcpJsonPath(), JSON.stringify(file));

      const result = await installMcpConfig('claude', projectDir, {
        target: 'project-committed',
        overwrite: 'overwrite',
      });
      expect(result.action).toBe('written');
      const after = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      expect(after.mcpServers.neuron).toEqual(proposedServer);
    });

    it('asks via onConflict when a conflicting entry exists and the ask policy is explicit', async () => {
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      const file = JSON.parse(fs.readFileSync(mcpJsonPath(), 'utf8'));
      file.mcpServers.neuron.args = ['old-args'];
      fs.writeFileSync(mcpJsonPath(), JSON.stringify(file));

      let asked = false;
      const result = await installMcpConfig('claude', projectDir, {
        target: 'project-committed',
        overwrite: 'ask',
        onConflict: async info => {
          asked = true;
          expect(info.targetPath).toBe(mcpJsonPath());
          return true;
        },
      });
      expect(asked).toBe(true);
      expect(result.action).toBe('written');
    });

    it('refuses to clobber a .mcp.json that is not valid JSON', async () => {
      fs.writeFileSync(mcpJsonPath(), '{ not valid json');
      await expect(installMcpConfig('claude', projectDir, { target: 'project-committed' })).rejects.toThrow(
        /not valid JSON/
      );
    });

    describe('project-local and user-global targets (~/.claude.json)', () => {
      let fakeHome: string;
      const originalHome = process.env.HOME;

      beforeEach(() => {
        fakeHome = path.join(tempRoot, `home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(fakeHome, { recursive: true });
        process.env.HOME = fakeHome;
      });

      afterEach(() => {
        process.env.HOME = originalHome;
      });

      it('project-local writes under projects["<absolute path>"].mcpServers in ~/.claude.json', async () => {
        const result = await installMcpConfig('claude', projectDir, { target: 'project-local' });
        const expectedPath = path.join(fakeHome, '.claude.json');
        expect(result.targetPath).toBe(expectedPath);

        const file = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
        expect(file.projects[path.resolve(projectDir)].mcpServers.neuron).toEqual(proposedServer);
      });

      it('user-global writes to the top-level mcpServers in ~/.claude.json, not under projects', async () => {
        const result = await installMcpConfig('claude', projectDir, { target: 'user-global' });
        const expectedPath = path.join(fakeHome, '.claude.json');
        expect(result.targetPath).toBe(expectedPath);

        const file = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
        expect(file.mcpServers.neuron).toEqual(proposedServer);
        expect(file.projects).toBeUndefined();
      });

      it('project-local and user-global coexist without clobbering each other in the same ~/.claude.json', async () => {
        await installMcpConfig('claude', projectDir, { target: 'project-local' });
        await installMcpConfig('claude', projectDir, { target: 'user-global' });

        const file = JSON.parse(fs.readFileSync(path.join(fakeHome, '.claude.json'), 'utf8'));
        expect(file.mcpServers.neuron).toEqual(proposedServer);
        expect(file.projects[path.resolve(projectDir)].mcpServers.neuron).toEqual(proposedServer);
      });

      it('isMcpConfigured reads project-local and user-global entries truthfully from disk', () => {
        expect(isMcpConfigured('claude', projectDir)).toBe(false);
        fs.mkdirSync(fakeHome, { recursive: true });
        fs.writeFileSync(
          path.join(fakeHome, '.claude.json'),
          JSON.stringify({ projects: { [path.resolve(projectDir)]: { mcpServers: { neuron: proposedServer } } } })
        );
        expect(isMcpConfigured('claude', projectDir)).toBe(true);
      });
    });

    it('isMcpConfigured is true once .mcp.json has the entry, regardless of the run\'s own flags', async () => {
      expect(isMcpConfigured('claude', projectDir)).toBe(false);
      await installMcpConfig('claude', projectDir, { target: 'project-committed' });
      expect(isMcpConfigured('claude', projectDir)).toBe(true);
    });
  });

  describe('cursor', () => {
    it('writes to .cursor/mcp.json for project-committed', async () => {
      const result = await installMcpConfig('cursor', projectDir, { target: 'project-committed' });
      const expectedPath = path.join(projectDir, '.cursor', 'mcp.json');
      expect(result.targetPath).toBe(expectedPath);
      const file = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
      expect(file.mcpServers.neuron).toEqual(proposedServer);
    });

    it('collapses project-local into the same mcp.json project-committed uses, with a warning', async () => {
      const result = await installMcpConfig('cursor', projectDir, { target: 'project-local' });
      expect(result.targetPath).toBe(path.join(projectDir, '.cursor', 'mcp.json'));
      expect(result.warning).toContain('no documented gitignored project-level MCP config scope');
    });

    describe('user-global target', () => {
      let fakeHome: string;
      const originalHome = process.env.HOME;

      beforeEach(() => {
        fakeHome = path.join(tempRoot, `home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(fakeHome, { recursive: true });
        process.env.HOME = fakeHome;
      });

      afterEach(() => {
        process.env.HOME = originalHome;
      });

      it('writes to ~/.cursor/mcp.json when the target is user-global', async () => {
        const result = await installMcpConfig('cursor', projectDir, { target: 'user-global' });
        const expectedPath = path.join(fakeHome, '.cursor', 'mcp.json');
        expect(result.targetPath).toBe(expectedPath);
        expect(fs.existsSync(expectedPath)).toBe(true);
      });
    });
  });

  describe('github (Copilot CLI)', () => {
    it('project-committed writes to .mcp.json — not .github/mcp.json — since Copilot CLI prefers .mcp.json when both exist', async () => {
      const result = await installMcpConfig('github', projectDir, { target: 'project-committed' });
      expect(result.targetPath).toBe(path.join(projectDir, '.mcp.json'));
      expect(fs.existsSync(path.join(projectDir, '.github', 'mcp.json'))).toBe(false);
    });

    it('collapses project-local into the same .mcp.json project-committed uses, with a warning', async () => {
      const result = await installMcpConfig('github', projectDir, { target: 'project-local' });
      expect(result.targetPath).toBe(path.join(projectDir, '.mcp.json'));
      expect(result.warning).toContain('no documented gitignored project-level MCP config scope');
    });

    describe('user-global target', () => {
      let fakeHome: string;
      const originalHome = process.env.HOME;

      beforeEach(() => {
        fakeHome = path.join(tempRoot, `home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(fakeHome, { recursive: true });
        process.env.HOME = fakeHome;
      });

      afterEach(() => {
        process.env.HOME = originalHome;
      });

      it('writes to ~/.copilot/mcp-config.json when the target is user-global', async () => {
        const result = await installMcpConfig('github', projectDir, { target: 'user-global' });
        const expectedPath = path.join(fakeHome, '.copilot', 'mcp-config.json');
        expect(result.targetPath).toBe(expectedPath);
        const file = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
        expect(file.mcpServers.neuron).toEqual(proposedServer);
      });
    });
  });

  describe('codex (config.toml table splice)', () => {
    const configPath = () => path.join(projectDir, '.codex', 'config.toml');

    it('appends a fresh [mcp_servers.neuron] table to a config.toml with no existing table of that name', async () => {
      fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
      fs.writeFileSync(configPath(), '# my own comment\nmodel = "gpt-5"\n\n[mcp_servers.other]\ncommand = "foo"\n');

      const result = await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      expect(result.action).toBe('written');

      const content = fs.readFileSync(configPath(), 'utf8');
      // Every pre-existing line, including the comment and the unrelated table, survives byte for byte.
      expect(content).toContain('# my own comment\nmodel = "gpt-5"\n\n[mcp_servers.other]\ncommand = "foo"\n');
      expect(content).toContain('[mcp_servers.neuron]');
      expect(content).toContain('command = "npx"');
      expect(content).toContain('args = ["-y", "@kovartravis/neuron", "mcp"]');
    });

    it('creates config.toml fresh when none exists', async () => {
      const result = await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      expect(result.action).toBe('written');
      const content = fs.readFileSync(configPath(), 'utf8');
      expect(content).toContain('[mcp_servers.neuron]');
    });

    it('is idempotent: a second install with identical content reports unchanged and does not duplicate the table', async () => {
      await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      const second = await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      expect(second.action).toBe('unchanged');
      const content = fs.readFileSync(configPath(), 'utf8');
      expect(content.match(/\[mcp_servers\.neuron\]/g)).toHaveLength(1);
    });

    it('keeps a conflicting neuron table by default under the "ask" policy with no prompt available, leaving surrounding content untouched', async () => {
      fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
      fs.writeFileSync(
        configPath(),
        '# header comment\n[mcp_servers.neuron]\ncommand = "custom"\nargs = ["hand-written"]\n\n[mcp_servers.other]\ncommand = "bar"\n'
      );

      const result = await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      expect(result.action).toBe('kept-existing');

      const content = fs.readFileSync(configPath(), 'utf8');
      expect(content).toContain('# header comment');
      expect(content).toContain('command = "custom"');
      expect(content).toContain('[mcp_servers.other]\ncommand = "bar"');
    });

    it('overwrites a conflicting neuron table when the overwrite policy says so, leaving other tables untouched', async () => {
      fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
      fs.writeFileSync(
        configPath(),
        '[mcp_servers.neuron]\ncommand = "custom"\nargs = ["hand-written"]\n\n[mcp_servers.other]\ncommand = "bar"\n'
      );

      const result = await installMcpConfig('codex', projectDir, {
        target: 'project-committed',
        overwrite: 'overwrite',
      });
      expect(result.action).toBe('written');

      const content = fs.readFileSync(configPath(), 'utf8');
      expect(content).toContain('command = "npx"');
      expect(content).not.toContain('command = "custom"');
      expect(content).toContain('[mcp_servers.other]\ncommand = "bar"');
    });

    it('asks via onConflict when a conflicting table exists and the ask policy is explicit', async () => {
      fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
      fs.writeFileSync(configPath(), '[mcp_servers.neuron]\ncommand = "custom"\n');

      let asked = false;
      const result = await installMcpConfig('codex', projectDir, {
        target: 'project-committed',
        overwrite: 'ask',
        onConflict: async info => {
          asked = true;
          expect(info.targetPath).toBe(configPath());
          return true;
        },
      });
      expect(asked).toBe(true);
      expect(result.action).toBe('written');
    });

    it('warns that the project must be trusted for a project-scoped write to actually load', async () => {
      const result = await installMcpConfig('codex', projectDir, { target: 'project-committed' });
      expect(result.warning).toContain('trust_level');
    });

    it('collapses project-local into the same config.toml project-committed uses, with a warning', async () => {
      const result = await installMcpConfig('codex', projectDir, { target: 'project-local' });
      expect(result.targetPath).toBe(configPath());
      expect(result.warning).toContain('no documented gitignored project-level MCP config scope');
    });

    describe('user-global target', () => {
      let fakeHome: string;
      const originalHome = process.env.HOME;

      beforeEach(() => {
        fakeHome = path.join(tempRoot, `home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(fakeHome, { recursive: true });
        process.env.HOME = fakeHome;
      });

      afterEach(() => {
        process.env.HOME = originalHome;
      });

      it('writes to ~/.codex/config.toml when the target is user-global, without the trust-level warning', async () => {
        const result = await installMcpConfig('codex', projectDir, { target: 'user-global' });
        const expectedPath = path.join(fakeHome, '.codex', 'config.toml');
        expect(result.targetPath).toBe(expectedPath);
        expect(result.warning).toBeUndefined();
        expect(fs.readFileSync(expectedPath, 'utf8')).toContain('[mcp_servers.neuron]');
      });
    });

    it('isMcpConfigured reads the table\'s presence truthfully from disk', () => {
      expect(isMcpConfigured('codex', projectDir)).toBe(false);
      fs.mkdirSync(path.join(projectDir, '.codex'), { recursive: true });
      fs.writeFileSync(configPath(), '[mcp_servers.neuron]\ncommand = "npx"\n');
      expect(isMcpConfigured('codex', projectDir)).toBe(true);
    });
  });

  describe('mcpTargetPath', () => {
    it('resolves without writing anything, matching what installMcpConfig would target', async () => {
      const path1 = mcpTargetPath('claude', projectDir, 'project-committed');
      const path2 = mcpTargetPath('github', projectDir, 'project-committed');
      expect(path1).toBe(path2); // claude and github share .mcp.json by design
      expect(fs.existsSync(path1)).toBe(false);
    });
  });

  it('MCP_SERVER_NAME is the stable key every harness writes its entry under', () => {
    expect(MCP_SERVER_NAME).toBe('neuron');
  });
});

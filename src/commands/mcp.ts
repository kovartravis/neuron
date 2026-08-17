import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NeuronMemory } from '../index.js';
import { performMemoryAdd } from './memory.js';
import { loadConfig, resolveExecCategories } from '../config/index.js';
import { autoRescanIfDriftDetected } from '../scanner/diff.js';
import { getRunningVersion } from '../components/version.js';

/**
 * `neuron mcp` (ticket 4, Map — MCP Server & Setup/Onboarding Skill Split):
 * a stdio-transport MCP server exposing the 3-tool surface ticket 1 designed
 * — thin wrappers over the same store methods the CLI itself calls
 * (`performMemoryAdd`, `NeuronMemory.queryGated`), never a parallel logic
 * path. No auth/scoping layer: a local stdio server is a subprocess the
 * client spawns directly, inheriting exactly the OS-level access of the
 * local user running it, identical to any CLI invocation (ticket 1's own
 * resolution).
 */
export async function handleMcpCommand(_args: string[]): Promise<void> {
  const memory = NeuronMemory.open(process.cwd());
  const config = loadConfig(process.cwd());

  const server = new McpServer({ name: 'neuron', version: getRunningVersion() });

  server.registerTool(
    'neuron_remember',
    {
      title: 'Remember',
      description:
        'Write a new entry to the neuron memory store, the durable, ' +
        'relevance-gated context an agent working in this project can recall ' +
        'later via neuron_recall or neuron_query_exec. Use this to record a ' +
        'decision, a fix, a fact about the project, or anything else worth ' +
        'carrying into a future session.',
      inputSchema: {
        content: z.string().describe('The full entry text. Write it complete — this is not a title.'),
        category: z
          .string()
          .optional()
          .describe('Category to file this under. Inferred from the store’s existing categories when omitted.'),
        importance: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe(
            'Importance 1-5, default 3. Not inferred automatically — set this explicitly when the entry should ' +
              'survive a routine prune (importance <= 3 is prune-eligible).'
          ),
        supersedes: z
          .string()
          .optional()
          .describe('Id of an existing entry this write reverses or replaces.'),
        companion_of: z
          .string()
          .optional()
          .describe('Id of an existing entry this write is a deliberate companion to, not a reversal of.'),
      },
    },
    async ({ content, category, importance, supersedes, companion_of }) => {
      const outcome = await performMemoryAdd(memory, {
        content,
        category,
        importance,
        supersedes,
        companionOf: companion_of,
      });

      if (outcome.kind === 'error') {
        if (outcome.code === 'supersession-block') {
          const { candidate } = outcome;
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text:
                  `${outcome.message} (reranker score ${candidate.rerankerScore.toFixed(3)}, cosine ${candidate.similarity.toFixed(3)}): ` +
                  `[${candidate.id}] (${candidate.category}) ${candidate.content}. ` +
                  `If this is a reversal, call neuron_remember again with supersedes: "${candidate.id}".`,
              },
            ],
          };
        }
        return { isError: true, content: [{ type: 'text', text: outcome.message }] };
      }

      if (outcome.kind === 'skipped') {
        // Unreachable from this tool: `if_novel` is deliberately not exposed
        // (ticket 1) since only `supersession-block` above can occur here.
        return { isError: true, content: [{ type: 'text', text: 'skipped: looked like a near-duplicate write' }] };
      }

      const payload = outcome.conflictFlag ? { ...outcome.entry, possibleConflict: outcome.conflictFlag } : outcome.entry;
      return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
    }
  );

  server.registerTool(
    'neuron_recall',
    {
      title: 'Recall',
      description:
        'Search the neuron memory store for entries relevant to a query. Returns the ' +
        'relevance-gated results plus how many additional candidates the gate rejected, ' +
        'so an empty result set is distinguishable from an empty store.',
      inputSchema: {
        query: z.string().describe('Free-text query to search for.'),
        categories: z.array(z.string()).optional().describe('Restrict the search to these categories.'),
      },
    },
    async ({ query, categories }) => {
      await autoRescanIfDriftDetected(memory);
      const { results, rejected } = await memory.queryGated({ text: query, categories });
      return { content: [{ type: 'text', text: JSON.stringify({ results, rejected }) }] };
    }
  );

  server.registerTool(
    'neuron_query_exec',
    {
      title: 'Query Exec',
      description:
        'Look up what neuron already knows that is relevant to a shell command you are about ' +
        'to run — the same automatic category matching `neuron exec` applies before spawning a ' +
        'command. Lookup only: this does not run the command.',
      inputSchema: {
        command_text: z.string().describe('The command text to look up relevant entries for.'),
      },
    },
    async ({ command_text }) => {
      const { categories, limit } = resolveExecCategories(config, command_text);
      const { results, rejected } = await memory.queryGated({ text: command_text, categories, limit });
      return { content: [{ type: 'text', text: JSON.stringify({ results, rejected }) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = () => {
    memory.close();
    process.exit(0);
  };
  server.server.onclose = shutdown;
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

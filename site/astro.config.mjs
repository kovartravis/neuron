// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const SITE_BASE = '/neuron';

// Hand-written markdown links (`[text](/docs/foo/)`) are passed through
// verbatim by Astro's markdown pipeline — unlike Starlight's own generated
// sidebar/nav links, they never get `base` prepended automatically. Left
// alone, every root-relative link authored in a content-collection page
// 404s on the deployed project-page URL (found while cross-linking
// ticket 9's reference pages; verified against the built `dist/` output,
// where the sidebar's own links correctly carried `/neuron` and every
// inline markdown link did not — a repo-wide gap, not new to this ticket).
// This rewrites any bare root-relative `href` (skips `//`, already-based,
// and non-`/`-leading values) at build time so every existing and future
// content page's plain markdown links resolve under the real base path.
function rehypeBaseLinks() {
	return (tree) => {
		visit(tree);
		function visit(node) {
			if (
				node.type === 'element' &&
				node.tagName === 'a' &&
				node.properties &&
				typeof node.properties.href === 'string'
			) {
				const href = node.properties.href;
				if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith(SITE_BASE + '/') && href !== SITE_BASE) {
					node.properties.href = SITE_BASE + href;
				}
			}
			if (node.children) {
				for (const child of node.children) visit(child);
			}
		}
	};
}

// Project page on GitHub Pages: https://kovartravis.github.io/neuron
// (ticket "Map — neuron.github.io Site (2.5.0)": no org named `neuron`
// exists, and a custom domain was considered and declined at chartering.)
export default defineConfig({
	site: 'https://kovartravis.github.io',
	base: SITE_BASE,
	markdown: {
		rehypePlugins: [rehypeBaseLinks],
	},
	integrations: [
		starlight({
			title: 'neuron',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/kovartravis/neuron' }],
			// Powers Head.astro's `dateModified` (Map — SEO & GEO Groundwork's
			// Ticket 3 JSON-LD strategy) via Starlight's built-in git-log lookup —
			// no per-page frontmatter needed.
			lastUpdated: true,
			components: {
				Head: './src/components/Head.astro',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', slug: 'docs' },
						{ label: 'Install', slug: 'docs/install' },
						{ label: 'Quickstart', slug: 'docs/quickstart' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Configuration', slug: 'docs/configuration' },
						{ label: 'Harness Adapters', slug: 'docs/harness-adapters' },
						{ label: 'Claude Code', slug: 'docs/harness-claude-code' },
						{ label: 'Codex CLI', slug: 'docs/harness-codex' },
						{ label: 'GitHub Copilot CLI', slug: 'docs/harness-copilot' },
						{ label: 'Cursor', slug: 'docs/harness-cursor' },
					],
				},
				{
					label: 'How It Works',
					items: [
						{ label: 'Hybrid Search & RRF', slug: 'docs/hybrid-search' },
						{ label: 'Write-Side Enrichment', slug: 'docs/write-side-enrichment' },
						{ label: 'Declared Field Schema', slug: 'docs/declared-field-schema' },
						{ label: 'Storage Adapters', slug: 'docs/storage-adapters' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'neuron init', slug: 'docs/cli-init' },
						{ label: 'neuron memory', slug: 'docs/cli-memory' },
						{ label: 'neuron exec', slug: 'docs/cli-exec' },
						{ label: 'neuron scan', slug: 'docs/cli-scan' },
						{ label: 'neuron sync', slug: 'docs/cli-sync' },
						{ label: 'neuron status', slug: 'docs/cli-status' },
						{ label: 'neuron ui', slug: 'docs/cli-ui' },
						{ label: 'neuron mcp', slug: 'docs/cli-mcp' },
						{ label: 'neuron feedback', slug: 'docs/cli-feedback' },
						{ label: 'neuron.yaml', slug: 'docs/config-reference' },
					],
				},
			],
		}),
	],
});

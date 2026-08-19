// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Project page on GitHub Pages: https://kovartravis.github.io/neuron
// (ticket "Map — neuron.github.io Site (2.5.0)": no org named `neuron`
// exists, and a custom domain was considered and declined at chartering.)
export default defineConfig({
	site: 'https://kovartravis.github.io',
	base: '/neuron',
	integrations: [
		starlight({
			title: 'neuron',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/kovartravis/neuron' }],
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
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});

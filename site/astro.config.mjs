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
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
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

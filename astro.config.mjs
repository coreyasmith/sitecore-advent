// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import plantuml from './syntaxes/plantuml.tmLanguage.json' with { type: 'json' };
import structurizr from './syntaxes/structurizr.tmLanguage.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
	site: process.env.CF_PAGES_URL || 'https://www.scadvent.com',
	integrations: [mdx(), sitemap()],
	// The site title's font (see Header). The file comes from the installed @fontsource package,
	// so the build never fetches it from a CDN, and Astro serves it from the site. Only the
	// basic Latin letters and the one weight the title uses.
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Grandstander',
			cssVariable: '--font-grandstander',
			options: {
				variants: [
					{
						src: ['@fontsource/grandstander/files/grandstander-latin-800-normal.woff2'],
						weight: 800,
						style: 'normal',
					},
				],
			},
		},
	],
	markdown: {
		shikiConfig: {
			// Upstream grammars use display names, so set the code block language IDs.
			// Types inferred from the JSON don't match Shiki's grammar types, hence `any`.
			langs: [
				{ .../** @type {any} */ (plantuml), name: 'plantuml' },
				{ .../** @type {any} */ (structurizr), name: 'structurizr' },
			],
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});

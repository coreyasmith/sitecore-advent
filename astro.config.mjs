// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import plantuml from './syntaxes/plantuml.tmLanguage.json' with { type: 'json' };
import structurizr from './syntaxes/structurizr.tmLanguage.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
	site: process.env.CF_PAGES_URL || 'https://www.scadvent.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			// Upstream grammars use display names, so set the code block language IDs
			langs: [
				{ ...plantuml, name: 'plantuml' },
				{ ...structurizr, name: 'structurizr' },
			],
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});

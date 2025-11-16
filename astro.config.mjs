// @ts-check

import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: process.env.CF_PAGES_URL || 'https://www.scadvent.com',
});

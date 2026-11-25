// @ts-check

/**
 * A hast plugin for Sätteri, Astro's Markdown processor. Tables too wide for the page
 * scroll sideways (see tailwind.config.js), so, like Shiki's code blocks, they take
 * keyboard focus to scroll without a mouse.
 *
 * @type {import('satteri').HastPluginDefinition}
 */
export const focusableTables = {
	name: 'focusable-tables',
	element: {
		filter: ['table'],
		visit(node, ctx) {
			ctx.setProperty(node, 'tabIndex', 0);
		},
	},
};

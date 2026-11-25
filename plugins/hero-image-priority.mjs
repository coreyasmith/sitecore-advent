// @ts-check

/**
 * A hast plugin for Sätteri, Astro's Markdown processor. Astro lazy-loads Markdown images,
 * but a post that opens with an image (its hero) has it on screen as the page loads, so
 * that one gets Astro's `priority`: loaded right away, ahead of other images.
 *
 * @type {import('satteri').HastPluginDefinition}
 */
export const heroImagePriority = {
	name: 'hero-image-priority',
	element: {
		filter: ['img'],
		visit(node, ctx) {
			// The very first thing in the post: first in its paragraph, which is first in the post
			for (let child = node, parent = ctx.parent(node); parent; child = parent, parent = ctx.parent(child)) {
				if (ctx.indexOf(child) !== 0) return;
			}
			ctx.setProperty(node, 'priority', true);
		},
	},
};

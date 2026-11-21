// @ts-check

/**
 * A Shiki transformer for code blocks. Shiki's github-dark theme draws code comments in
 * #6a737d, only 3:1 on its #24292e background. This swaps in GitHub's lighter gray, which
 * reads at 5.3:1, enough for WCAG AA. Every other color stays as the theme has it.
 *
 * @type {import('shiki').ShikiTransformer}
 */
export const readableCodeComments = {
	name: 'readable-code-comments',
	tokens(lines) {
		for (const token of lines.flat()) {
			if (token.color?.toLowerCase() === '#6a737d') token.color = '#959da5';
		}
	},
};

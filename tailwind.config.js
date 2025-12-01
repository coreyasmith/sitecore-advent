/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // Make body text color match headings (white for invert mode)
            '--tw-prose-invert-body': 'var(--color-white)',
            // Make bullets match headings color
            '--tw-prose-invert-bullets': 'var(--color-white)',
            '--tw-prose-invert-counters': 'var(--color-white)',
            // Make hr color match font color in invert mode
            '--tw-prose-invert-hr': 'var(--color-white)',
            // Make blockquote border match font color in invert mode
            '--tw-prose-invert-quote-borders': 'var(--color-white)',
            // Make table borders appropriate for dark mode
            '--tw-prose-invert-th-borders': 'rgba(255, 255, 255, 0.5)',
            '--tw-prose-invert-td-borders': 'rgba(255, 255, 255, 0.4)',

            // Reduce spacing between elements
            'p': {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            'h1': {
              marginTop: '0',
              marginBottom: '0.75em',
            },
            'h2': {
              marginTop: '1.25em',
              marginBottom: '0.5em',
            },
            'h3': {
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            'h4': {
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            'ul': {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            'ol': {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            'li': {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            '> ul > li p': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            '> ul > li > p:first-child': {
              marginTop: '0.75em',
            },
            '> ul > li > p:last-child': {
              marginBottom: '0.75em',
            },
            '> ol > li > p:first-child': {
              marginTop: '0.75em',
            },
            '> ol > li > p:last-child': {
              marginBottom: '0.75em',
            },
            'ul ul, ul ol, ol ul, ol ol': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            'h2 + *': {
              marginTop: '0',
            },
            'h3 + *': {
              marginTop: '0',
            },
            'h4 + *': {
              marginTop: '0',
            },
            'hr': {
              marginTop: '2em',
              marginBottom: '2em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            'blockquote p:first-of-type::before': {
              content: '""',
            },
            'blockquote p:last-of-type::after': {
              content: '""',
            },
            'img': {
              marginLeft: 'auto',
              marginRight: 'auto',
            },
            'picture': {
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
            },
            // Make tables scrollable like code blocks
            'table': {
              display: 'block',
              overflowX: 'auto',
            },
          },
        },
      },
    },
  },
}

// Checks every page of the production build with axe-core, at a desktop and a phone width,
// and fails if any page has a violation. `npm run a11y` builds the site first.
//
// It drives the installed Chrome through puppeteer-core, which doesn't download a browser of
// its own; set CHROME_PATH to use a different one. Pass --review to also list everything axe
// couldn't decide by itself, such as the contrast of text over a gradient or an image.

import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import axe from 'axe-core';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = new URL('../dist/', import.meta.url);
const listReview = process.argv.includes('--review');
const tabs = 4;

const viewports = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

// Every built page as a URL path: dist/2026/welcome/index.html is /2026/welcome/
async function findPages() {
	const files = await readdir(dist, { recursive: true });
	return files
		.map((file) => file.replaceAll('\\', '/'))
		.filter((file) => file.endsWith('.html'))
		.map((file) => '/' + file.replace(/(^|\/)index\.html$/, '$1'))
		.sort();
}

// Runs axe on each page at each width, a few tabs at a time
async function check(browser, origin, pages) {
	const jobs = Object.entries(viewports).flatMap(([width, viewport]) => pages.map((path) => ({ path, width, viewport })));
	const results = [];
	await Promise.all(
		Array.from({ length: tabs }, async () => {
			const tab = await browser.newPage();
			await tab.setCacheEnabled(false);
			for (let job = jobs.shift(); job; job = jobs.shift()) {
				await tab.setViewport(job.viewport);
				const response = await tab.goto(origin + job.path, { waitUntil: 'load' });
				if (!response?.ok()) {
					results.push({ ...job, error: `HTTP ${response?.status()}` });
					continue;
				}
				await tab.evaluate(() => document.fonts.ready);
				await tab.addScriptTag({ content: axe.source });
				const { violations, incomplete } = await tab.evaluate(() =>
					window.axe.run(document, { resultTypes: ['violations', 'incomplete'] }),
				);
				results.push({ ...job, violations, incomplete });
			}
			await tab.close();
		}),
	);
	return results;
}

// One entry per rule, and within it one per distinct problem (the same message on many
// elements, such as one code comment color, is one problem), with where it turned up
function byRule(results, type) {
	const rules = new Map();
	for (const result of results) {
		for (const rule of result[type] ?? []) {
			if (!rules.has(rule.id)) rules.set(rule.id, { rule, problems: new Map(), count: 0 });
			const entry = rules.get(rule.id);
			for (const node of rule.nodes) {
				const message = node.failureSummary ?? rule.help;
				if (!entry.problems.has(message)) entry.problems.set(message, { elements: [], pages: new Set() });
				const problem = entry.problems.get(message);
				problem.elements.push(`${node.target.join(' ')} on ${result.path} (${result.width})`);
				problem.pages.add(result.path);
				entry.count++;
			}
		}
	}
	return rules;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function print(rules) {
	for (const { rule, problems } of rules.values()) {
		const level = rule.tags.find((tag) => /^wcag\d+a+$/.test(tag)) ?? (rule.tags.includes('best-practice') ? 'best practice' : 'other');
		console.log(`\n${rule.id} (${rule.impact ?? 'no impact'}, ${level}): ${rule.help}\n  ${rule.helpUrl}`);
		for (const [message, { elements, pages }] of problems) {
			console.log(`\n${message.replace(/^/gm, '  ')}`);
			console.log(`    ${plural(elements.length, 'element')} on ${plural(pages.size, 'page')}, such as:`);
			for (const element of elements.slice(0, 3)) console.log(`      ${element}`);
		}
	}
}

const pages = await findPages();
if (pages.length === 0) throw new Error('No pages in dist. Run `npm run build` first.');

const server = await preview({ root, logLevel: 'error', server: { port: 4330 } });
const browser = await puppeteer.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let results;
try {
	results = await check(browser, `http://localhost:${server.port}`, pages);
} finally {
	await browser.close();
	await server.stop();
}

const errors = results.filter((result) => result.error);
for (const { path, width, error } of errors) console.log(`Couldn't check ${path} (${width}): ${error}`);

const violations = byRule(results, 'violations');
print(violations);

const review = byRule(results, 'incomplete');
if (listReview) {
	console.log('\n\nNeeds review (axe couldn\'t decide):');
	print(review);
} else if (review.size > 0) {
	console.log('\nNeeds review (axe couldn\'t decide; pass --review to list them):');
	for (const [id, { count }] of review) console.log(`  ${id}: ${plural(count, 'element')}`);
}

const failed = [...violations.values()].reduce((sum, { count }) => sum + count, 0);
console.log(
	`\naxe-core ${axe.version}: ${pages.length} pages at ${Object.keys(viewports).join(' and ')} widths, ` +
		(failed ? `${plural(violations.size, 'rule')} failed on ${plural(failed, 'element')}` : 'no violations'),
);
if (failed || errors.length) process.exitCode = 1;

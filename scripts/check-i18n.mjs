import { readFileSync } from 'node:fs';

const load = (l) =>
  JSON.parse(readFileSync(new URL(`../src/presentation/i18n/locales/${l}.json`, import.meta.url), 'utf8'));
const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

const en = new Set(flat(load('en')));
const te = new Set(flat(load('te')));
const problems = [...en].filter((k) => !te.has(k)).map((k) => `missing in te: ${k}`)
  .concat([...te].filter((k) => !en.has(k)).map((k) => `missing in en: ${k}`));

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`i18n OK (${en.size} keys)`);

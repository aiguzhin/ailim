// Verifies that every language has the same interface keys and the same content IDs/structure as Russian.
// Run: npm run check
import fs from 'node:fs';

const langs = JSON.parse(fs.readFileSync('public/content/languages.json', 'utf8')).map((l) => l.code);
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ref = read('public/i18n/ru.json');
let problems = 0;
const fail = (msg) => { problems += 1; console.error('✗', msg); };

// Plural keys may differ per language (ru has few/many, en/kk do not).
const base = (k) => k.replace(/\.(one|few|many|other)$/, '');
for (const lang of langs) {
  const d = read(`public/i18n/${lang}.json`);
  const refBases = new Set(Object.keys(ref).map(base));
  const dBases = new Set(Object.keys(d).map(base));
  for (const k of refBases) if (!dBases.has(k)) fail(`${lang}: missing key ${k}`);
  for (const k of dBases) if (!refBases.has(k)) fail(`${lang}: extra key ${k}`);
  for (const [k, v] of Object.entries(d)) {
    const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    const r = ref[k] ?? ref[`${base(k)}.other`];
    if (r !== undefined && vars(r) !== vars(v)) fail(`${lang}: placeholders differ in ${k}`);
  }
  // Content structure
  for (const file of ['lessons', 'practice', 'directions', 'tools', 'quiz', 'pages']) {
    const a = read(`public/content/ru/${file}.json`);
    const b = read(`public/content/${lang}/${file}.json`);
    const shape = (x) => JSON.stringify(x, (key, val) => (typeof val === 'string' && !['id', 'direction', 'topic', 'type', 'value'].includes(key) ? '' : val));
    if (shape(a) !== shape(b)) fail(`${lang}: content/${file}.json structure or IDs differ from ru`);
  }
}

// Every literal key used in code must exist.
const used = new Set();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const p = `${dir}/${e.name}`;
  if (e.isDirectory()) walk(p);
  else if (p.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
});
walk('public/js');
used.delete('key'); // example in a comment
// Keys built dynamically in templates.
const dynamic = [
  ...['continue', 'plan', 'next'].map((x) => `account.next.${x}`), ...['favorites', 'history', 'badges'].map((x) => `account.tab.${x}`),
  ...['first', 'three', 'basics', 'practice', 'explorer', 'plan', 'collector', 'all'].flatMap((x) => [`badge.${x}.title`, `badge.${x}.text`]),
  ...['simple', 'friendly', 'formal', 'creative'].flatMap((x) => [`builder.tone.${x}`, `builder.tpl.tone.${x}`]),
  ...['list', 'steps', 'table', 'text'].flatMap((x) => [`builder.format.${x}`, `builder.tpl.format.${x}`]),
  ...['short', 'medium', 'long'].flatMap((x) => [`builder.length.${x}`, `builder.tpl.length.${x}`]),
  ...['clarify', 'uncertain', 'sources', 'noJargon'].flatMap((x) => [`builder.opt.${x}`, `builder.tpl.opt.${x}`]),
  ...['explain', 'write', 'summarize', 'ideas', 'plan', 'edit', 'image', 'code'].flatMap((x) => [`builder.task.${x}`, `builder.tpl.${x}`]),
  ...['new', 'started', 'done', 'fav', 'todo'].map((x) => `filter.status.${x}`),
  ...[1, 2, 3].flatMap((n) => [`home.how.${n}.title`, `home.how.${n}.text`, `level.${n}`]), ...[1, 2, 3, 4].map((n) => `home.safe.${n}`),
  ...['continue', 'plan', 'next'].map((x) => `home.personal.${x}`), 'practice.type.choice', 'practice.type.write', 'auth.hidePassword',
  ...['system', 'light', 'dark'].map((x) => `settings.theme.${x}`), ...['s', 'm', 'l'].map((x) => `settings.textSize.${x}`), ...['system', 'reduce', 'full'].map((x) => `settings.motion.${x}`),
  ...['server_error', 'network_error', 'invalid_email', 'consent_required', 'email_taken', 'invalid_credentials', 'too_many_requests', 'auth_required', 'bad_origin', 'json_required', 'unknown_item', 'not_found', 'wrong_password', 'invalid_value', 'nothing_to_update', 'bad_json', 'invalid_token', 'weak_password', 'name_required'].map((x) => `error.${x}`),
];
dynamic.forEach((k) => used.add(k));
for (const k of used) if (!(k in ref) && !(`${k}.other` in ref)) fail(`code uses missing key ${k}`);

console.log(problems ? `${problems} problem(s)` : `OK: ${langs.join(', ')} are consistent (${Object.keys(ref).length} keys)`);
process.exit(problems ? 1 : 0);

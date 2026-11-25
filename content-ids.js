import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The Russian content files are the reference set of IDs; other languages must use the same IDs.
const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'content');
const read = (f) => JSON.parse(fs.readFileSync(path.join(base, 'ru', f), 'utf8'));
const readShared = (f) => JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));

const ids = new Set([
  ...read('lessons.json').map((l) => `lesson:${l.id}`),
  ...readShared('tools.json').tools.map((t) => `tool:${t.id}`),
  ...read('practice.json').map((p) => `task:${p.id}`),
]);

export const isKnownItem = (itemId) => ids.has(itemId);
export const lessonSteps = Object.fromEntries(read('lessons.json').map((l) => [`lesson:${l.id}`, l.steps.length]));

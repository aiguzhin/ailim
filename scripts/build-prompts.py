#!/usr/bin/env python3
"""Builds the prompt library JSON from the editable sources in scripts/prompt-data/.

Sources:
  map.py            categories, subtopics and audiences in ru / en / kk
  p_<category>.py   prompts of one category (4 per subtopic: short, detailed, refine, check)

Output (served by the site):
  public/content/prompts/index.json         shared structure
  public/content/prompts/<category>.json    shared prompt metadata
  public/content/<lang>/prompts/index.json  names in a language
  public/content/<lang>/prompts/<category>.json  prompt texts in a language

Run: python3 scripts/build-prompts.py
"""
import importlib.util, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'scripts', 'prompt-data')
OUT = os.path.join(ROOT, 'public', 'content')
LANGS = ['ru', 'en', 'kk']
KINDS = ['short', 'detailed', 'refine', 'check']
CHECKED = '2026-11-26'
# Prompts meant for a text assistant inside a non-text category start with this marker in every language.
CHAT_MARKERS = ['(в текстовом ассистенте) ', '(in a text assistant) ', '(мәтіндік көмекшіде) ']

sys.path.insert(0, SRC)
from map import CATS, AUDIENCES  # noqa: E402

def load(cat):
    path = os.path.join(SRC, f'p_{cat}.py')
    if not os.path.exists(path):
        return None
    spec = importlib.util.spec_from_file_location(f'p_{cat}', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.P

def dump(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

placeholder = re.compile(r'\[[^\]]+\]')
index = {'checked': CHECKED, 'kinds': KINDS, 'categories': []}
names = {l: {'categories': {}, 'subtopics': {}, 'audiences': {}} for l in LANGS}
for key, (ru, en, kk) in AUDIENCES.items():
    for l, v in zip(LANGS, (ru, en, kk)):
        names[l]['audiences'][key] = v

total = 0
problems = []
for cid, icon, needs, lesson, audiences, cnames, subs in CATS:
    prompts = load(cid)
    for l, v in zip(LANGS, cnames):
        names[l]['categories'][cid] = v
    meta, texts = [], {l: {'prompts': {}, 'verify': {}} for l in LANGS}
    sub_ids = []
    for sid, *snames in subs:
        full = f'{cid}.{sid}'
        sub_ids.append(sid)
        for l, v in zip(LANGS, snames):
            names[l]['subtopics'][full] = v
        if not prompts:
            continue
        p = prompts.get(sid)
        if not p:
            problems.append(f'{full}: no prompts')
            continue
        for l, v in zip(LANGS, p['verify']):
            texts[l]['verify'][full] = v
        for kind in KINDS:
            values = list(p[kind])
            for_chat = any(values[i].startswith(CHAT_MARKERS[i]) for i in range(3))
            if for_chat:
                values = [values[i].replace(CHAT_MARKERS[i], '', 1) for i in range(3)]
            pid = f'{full}.{kind}'
            counts = [len(set(placeholder.findall(v))) for v in values]
            if len(set(counts)) != 1:
                problems.append(f'{pid}: placeholder count differs between languages {counts}')
            meta.append({'id': pid, 'subtopic': sid, 'kind': kind, 'level': p['level'],
                         'result': 'explanation' if (for_chat and p['result'] == 'image') else p['result'],
                         'needs': ['chat'] if for_chat else needs, 'checked': CHECKED})
            for l, v in zip(LANGS, values):
                texts[l]['prompts'][pid] = v
            total += 1
    index['categories'].append({'id': cid, 'icon': icon, 'needs': needs, 'lesson': lesson,
                                'audiences': audiences, 'subtopics': sub_ids, 'prompts': len(meta)})
    if prompts:
        dump(os.path.join(OUT, 'prompts', f'{cid}.json'), meta)
        for l in LANGS:
            dump(os.path.join(OUT, l, 'prompts', f'{cid}.json'), texts[l])

dump(os.path.join(OUT, 'prompts', 'index.json'), index)
for l in LANGS:
    dump(os.path.join(OUT, l, 'prompts', 'index.json'), names[l])

subs_total = sum(len(c['subtopics']) for c in index['categories'])
print(f'categories: {len(index["categories"])}, subtopics: {subs_total}, prompts: {total}')
if problems:
    print('\n'.join(problems))
    sys.exit(1)

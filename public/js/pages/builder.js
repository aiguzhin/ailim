import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, copyText, toast } from '../ui.js';

const TASKS = ['explain', 'write', 'summarize', 'ideas', 'plan', 'edit', 'image', 'code'];
const TONES = ['simple', 'friendly', 'formal', 'creative'];
const FORMATS = ['list', 'steps', 'table', 'text'];
const LENGTHS = ['short', 'medium', 'long'];
const OPTS = ['clarify', 'uncertain', 'sources', 'noJargon'];

// Rough detection of personal data in the user's input (email, phone, 12-digit ID).
const PII = /[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s()-]*){10,}/;

function chips(name, values, selected) {
  return `<div class="seg" role="radiogroup" aria-labelledby="lbl-${name}">
    ${values.map((v) => `<button class="chip" type="button" role="radio" data-${name}="${v}" aria-checked="${v === selected}" aria-pressed="${v === selected}">${esc(t(`builder.${name}.${v}`))}</button>`).join('')}
  </div>`;
}

function build(s) {
  const parts = [];
  const topic = s.topic.trim() || t('builder.topicPlaceholderShort');
  parts.push(t(`builder.tpl.${s.task}`, { topic }));
  if (s.audience.trim()) parts.push(t('builder.tpl.audience', { v: s.audience.trim() }));
  if (s.context.trim()) parts.push(t('builder.tpl.context', { v: s.context.trim() }));
  parts.push(t(`builder.tpl.tone.${s.tone}`));
  parts.push(t(`builder.tpl.format.${s.format}`));
  parts.push(t(`builder.tpl.length.${s.length}`));
  for (const o of OPTS) if (s.opts.has(o)) parts.push(t(`builder.tpl.opt.${o}`));
  return parts.join('\n');
}

export default {
  title: () => t('nav.builder'),
  async render() {
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(t('builder.eyebrow'))}</span>
      <h1>${esc(t('builder.title'))}</h1>
      <p>${esc(t('builder.lead'))}</p>
    </div></div>
    <div class="wrap builder" style="padding-bottom:4rem">
      <form id="builder-form" novalidate>
        <div class="field"><label for="b-task">${esc(t('builder.task'))}</label>
          <select id="b-task">${TASKS.map((x) => `<option value="${x}">${esc(t(`builder.task.${x}`))}</option>`).join('')}</select></div>
        <div class="field"><label for="b-topic">${esc(t('builder.topic'))}</label>
          <input id="b-topic" type="text" maxlength="200" placeholder="${esc(t('builder.topicPlaceholder'))}"></div>
        <div class="field"><label for="b-aud">${esc(t('builder.audience'))}</label>
          <input id="b-aud" type="text" maxlength="120" placeholder="${esc(t('builder.audiencePlaceholder'))}"></div>
        <div class="field"><label for="b-ctx">${esc(t('builder.context'))}</label>
          <textarea id="b-ctx" maxlength="1000" placeholder="${esc(t('builder.contextPlaceholder'))}" style="min-height:90px"></textarea>
          <span class="hint">${esc(t('builder.contextHint'))}</span></div>
        <div class="field"><span class="label" id="lbl-tone">${esc(t('builder.tone'))}</span>${chips('tone', TONES, 'simple')}</div>
        <div class="field"><span class="label" id="lbl-format">${esc(t('builder.format'))}</span>${chips('format', FORMATS, 'list')}</div>
        <div class="field"><span class="label" id="lbl-length">${esc(t('builder.length'))}</span>${chips('length', LENGTHS, 'medium')}</div>
        <fieldset class="field" style="border:0;padding:0"><legend class="label" style="margin-bottom:.3rem">${esc(t('builder.extras'))}</legend>
          ${OPTS.map((o) => `<label class="check small"><input type="checkbox" data-opt="${o}"${o === 'uncertain' ? ' checked' : ''}><span>${esc(t(`builder.opt.${o}`))}</span></label>`).join('')}
        </fieldset>
      </form>
      <div class="output">
        <div id="pii-warning"></div>
        <div class="prompt-box" style="margin-top:0">
          <header><span id="out-label">${esc(t('builder.result'))}</span>
            <span class="btn-row" style="gap:.25rem">
              <button class="btn btn-ghost btn-sm" type="button" id="b-reset">${icon('refresh')}${esc(t('action.reset'))}</button>
              <button class="btn btn-primary btn-sm" type="button" id="b-copy">${icon('copy')}${esc(t('action.copy'))}</button></span></header>
          <textarea id="b-out" aria-labelledby="out-label" style="min-height:260px"></textarea>
        </div>
        <p class="small muted" id="b-edited" aria-live="polite"></p>
        <div class="notice info" style="margin-top:1rem">${icon('lock')}<div><p>${esc(t('builder.privacy'))}</p></div></div>
      </div>
    </div>`;
  },
  mount(el) {
    const s = { task: 'explain', topic: '', audience: '', context: '', tone: 'simple', format: 'list', length: 'medium', opts: new Set(['uncertain']) };
    const out = el.querySelector('#b-out');
    const edited = el.querySelector('#b-edited');
    let manual = false;

    const refresh = () => {
      const pii = PII.test(`${s.topic} ${s.audience} ${s.context}`);
      el.querySelector('#pii-warning').innerHTML = pii
        ? `<div class="notice warn" role="alert" style="margin-bottom:1rem">${icon('alert')}<div><p>${esc(t('builder.piiWarning'))}</p></div></div>` : '';
      if (!manual) out.value = build(s);
    };
    const markAuto = () => { manual = false; edited.textContent = ''; };

    el.querySelector('#b-task').addEventListener('change', (e) => { s.task = e.target.value; markAuto(); refresh(); });
    el.querySelector('#b-topic').addEventListener('input', (e) => { s.topic = e.target.value; markAuto(); refresh(); });
    el.querySelector('#b-aud').addEventListener('input', (e) => { s.audience = e.target.value; markAuto(); refresh(); });
    el.querySelector('#b-ctx').addEventListener('input', (e) => { s.context = e.target.value; markAuto(); refresh(); });
    el.querySelectorAll('[data-opt]').forEach((c) => c.addEventListener('change', () => {
      if (c.checked) s.opts.add(c.dataset.opt); else s.opts.delete(c.dataset.opt);
      markAuto(); refresh();
    }));
    el.querySelector('#builder-form').addEventListener('click', (e) => {
      for (const key of ['tone', 'format', 'length']) {
        const b = e.target.closest(`[data-${key}]`);
        if (!b) continue;
        s[key] = b.dataset[key];
        el.querySelectorAll(`[data-${key}]`).forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.setAttribute('aria-pressed', String(on)); });
        markAuto(); refresh();
      }
    });
    el.querySelector('#builder-form').addEventListener('submit', (e) => e.preventDefault());
    out.addEventListener('input', () => { manual = true; edited.textContent = t('builder.edited'); });
    el.querySelector('#b-copy').addEventListener('click', () => {
      if (!out.value.trim()) { toast(t('builder.empty'), 'error'); return; }
      copyText(out.value);
    });
    el.querySelector('#b-reset').addEventListener('click', () => { markAuto(); refresh(); });
    refresh();
    return null;
  },
};

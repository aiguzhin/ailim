// Example prompt block with "copy" and "edit" buttons. Editing turns the text into a textarea.
import { t } from './i18n.js';
import { icon } from './icons.js';
import { esc, copyText } from './ui.js';

let n = 0;
export function promptBox(text, { label, bad = false } = {}) {
  const id = `pb-${++n}`;
  if (bad) {
    return `<div class="prompt-box" style="opacity:.85"><header><span>${esc(t('lesson.weak'))}</span></header><pre>${esc(text)}</pre></div>`;
  }
  return `<div class="prompt-box" data-prompt-box>
    <header><span id="${id}-l">${esc(label || t('lesson.example'))}</span>
      <span class="btn-row" style="gap:.25rem">
        <button class="btn btn-ghost btn-sm" type="button" data-pb-edit aria-pressed="false">${icon('edit')}${esc(t('action.edit'))}</button>
        <button class="btn btn-ghost btn-sm" type="button" data-pb-copy>${icon('copy')}${esc(t('action.copy'))}</button>
      </span></header>
    <pre aria-labelledby="${id}-l">${esc(text)}</pre>
  </div>`;
}

export function bindPromptBoxes(root) {
  const onClick = (e) => {
    const box = e.target.closest('[data-prompt-box]');
    if (!box) return;
    if (e.target.closest('[data-pb-copy]')) {
      const area = box.querySelector('textarea');
      copyText(area ? area.value : box.querySelector('pre').textContent);
    }
    const edit = e.target.closest('[data-pb-edit]');
    if (edit) {
      const pre = box.querySelector('pre');
      if (pre) {
        const ta = document.createElement('textarea');
        ta.value = pre.textContent;
        ta.setAttribute('aria-label', t('lesson.editPrompt'));
        pre.replaceWith(ta);
        ta.style.height = `${Math.max(150, ta.scrollHeight + 4)}px`;
        ta.focus();
        edit.setAttribute('aria-pressed', 'true');
      } else {
        const ta = box.querySelector('textarea');
        const p = document.createElement('pre');
        p.textContent = ta.value;
        ta.replaceWith(p);
        edit.setAttribute('aria-pressed', 'false');
      }
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

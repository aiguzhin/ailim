// Ailim icon set: 24px grid, 1.75 stroke, round caps. Decorative by default (aria-hidden).
const paths = {
  logo: '<rect x="1" y="1" width="30" height="30" rx="6" fill="currentColor" stroke="none"/><circle cx="14" cy="18.5" r="5" stroke="var(--paper)" stroke-width="2.6"/><path d="M19 13.5v10" stroke="var(--paper)" stroke-width="2.6"/><rect x="16.7" y="5.6" width="4.6" height="4.6" rx="1" fill="var(--saffron)" stroke="none"/>',
  chat: '<path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  text: '<path d="M5 5h14M5 9.5h14M5 14h9M5 18.5h6"/><path d="M16.5 15.5l3 3"/><path d="M15 20l.6-2.6 4.6-4.6 2 2-4.6 4.6z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="10" r="1.75"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="1.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',
  study: '<path d="M3 8.5L12 4l9 4.5-9 4.5z"/><path d="M7 10.5v4.5c0 1.3 2.2 2.5 5 2.5s5-1.2 5-2.5v-4.5M21 8.5v5"/>',
  work: '<rect x="3.5" y="7.5" width="17" height="12" rx="1.5"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  slides: '<rect x="3.5" y="4.5" width="17" height="11" rx="1"/><path d="M12 15.5v4M8.5 19.5h7M7.5 12l3-3 2 2 4-4"/>',
  plan: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M8 3.5v3M16 3.5v3M4 10h16M8 14l1.5 1.5L12.5 12.5"/>',
  everyday: '<path d="M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.5l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  basics: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5l3 1.5"/>',
  shield: '<path d="M12 3.5l7.5 3v5.5c0 4.3-3.2 7.6-7.5 8.5-4.3-.9-7.5-4.2-7.5-8.5V6.5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  bookmark: '<path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
  edit: '<path d="M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19z"/><path d="M13.5 7l3.5 3.5"/>',
  arrowRight: '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  arrowLeft: '<path d="M19.5 12h-15M10 6.5L4.5 12l5.5 5.5"/>',
  external: '<path d="M13.5 4.5h6v6M19.5 4.5l-9 9M18 13.5v5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17v.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.75"/>',
  eyeOff: '<path d="M4 4l16 16M10 6c.6-.1 1.3-.2 2-.2 6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.8 3.5M6.6 7.4C3.9 9.2 2.5 12 2.5 12S6 18.2 12 18.2c1.6 0 3-.4 4.2-1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 9.5L6 3.5h4l2 4 2-4h4l-2.5 6"/><path d="M12 12.5v4"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  route: '<circle cx="6" cy="18" r="2.25"/><circle cx="18" cy="6" r="2.25"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13"/>',
  logout: '<path d="M14 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  refresh: '<path d="M19.5 8A8 8 0 0 0 5 9M4.5 16A8 8 0 0 0 19 15"/><path d="M19.5 4v4h-4M4.5 20v-4h4"/>',
};

export function icon(name, { label, cls = '' } = {}) {
  const vb = name === 'logo' ? '0 0 32 32' : '0 0 24 24';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="${cls}" viewBox="${vb}" ${a11y} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

// Map content directions / categories to icons.
export const directionIcon = {
  basics: 'basics', study: 'study', writing: 'text', slides: 'slides', images: 'image', video: 'video',
  audio: 'audio', code: 'code', planning: 'plan', everyday: 'everyday',
  chat: 'chat', text: 'text', learning: 'work', web: 'code',
};

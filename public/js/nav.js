// Client-side navigation without importing the router (avoids circular imports).
export function go(to, { replace = false } = {}) {
  history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.dispatchEvent(new Event('ailim:navigate'));
}

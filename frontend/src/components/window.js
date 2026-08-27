import { api } from '../core/api.js';

export function initWindowControls() {
  document.getElementById('btn-close')?.addEventListener('click', () => api.close());
  document.getElementById('btn-minimize')?.addEventListener('click', () => api.minimize());

  document.querySelectorAll('a[data-external], .social-links a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href && href !== '#') api.openExternal(href);
    });
  });
}

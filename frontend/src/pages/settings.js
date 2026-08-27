/* ─── Theme toggle ─────────────────────────────────────── */
export function initTheme() {
  const html = document.documentElement;
  const btn = document.getElementById('btn-theme');
  if (!btn) return;

  const saved = localStorage.getItem('theme');
  // Applique le thème sauvegardé (sinon 'dark' par défaut via l'attribut HTML)
  if (saved === 'light' || saved === 'dark') {
    html.dataset.theme = saved;
  }

  btn.addEventListener('click', () => {
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    localStorage.setItem('theme', next);
  });
}

/* ─── Snow / Motion settings ────────────────────────────── */
export function initSettings() {
  const snowToggle = document.getElementById('snow-toggle');
  const snowStatus = document.getElementById('snow-toggle-status');
  const reducedMotionToggle = document.getElementById('reduced-motion-toggle');
  const reducedMotionStatus = document.getElementById('reduced-motion-status');
  const enabled = localStorage.getItem('snow_enabled') !== '0';
  const reducedMotion = localStorage.getItem('reduced_motion') === '1';

  const updateSnowStatus = on => {
    if (!snowStatus) return;
    snowStatus.textContent = window.i18n?.t(on ? 'settings.snow.enabled' : 'settings.snow.disabled')
      ?? (on ? 'Activé' : 'Désactivé');
  };

  const setSnowEnabled = on => {
    localStorage.setItem('snow_enabled', on ? '1' : '0');
    updateSnowStatus(on);

    const storm = window.snowStorm;
    if (!storm) return;

    if (document.body.classList.contains('reduced-motion')) {
      storm.stop?.();
      storm.active = 0;
      return;
    }

    if (on) {
      storm.active = 1;
      if (!storm.flakes?.length) {
        storm.disabled = 0;
        storm.start?.();
      } else {
        storm.show?.();
        storm.resume?.();
      }
      return;
    }

    storm.stop?.();
    storm.active = 0;
  };

  const updateReducedMotionStatus = on => {
    if (!reducedMotionStatus) return;
    reducedMotionStatus.textContent = window.i18n?.t(on ? 'settings.reduced_motion.enabled' : 'settings.reduced_motion.disabled')
      ?? (on ? 'Activé' : 'Désactivé');
  };

  const setReducedMotion = on => {
    localStorage.setItem('reduced_motion', on ? '1' : '0');
    document.body.classList.toggle('reduced-motion', on);
    updateReducedMotionStatus(on);
    if (on) {
      window.snowStorm?.stop?.();
      if (window.snowStorm) window.snowStorm.active = 0;
    } else if (snowToggle) {
      setSnowEnabled(snowToggle.checked);
    }
  };

  if (snowToggle) {
    snowToggle.checked = enabled;
    snowToggle.setAttribute('aria-checked', String(enabled));
    updateSnowStatus(enabled);
    snowToggle.addEventListener('change', e => {
      const on = !!e.target.checked;
      snowToggle.setAttribute('aria-checked', String(on));
      setSnowEnabled(on);
    });
    document.addEventListener('i18n:changed', () => updateSnowStatus(snowToggle.checked));
  }
  if (!enabled) setSnowEnabled(false);

  if (reducedMotionToggle) {
    reducedMotionToggle.checked = reducedMotion;
    reducedMotionToggle.setAttribute('aria-checked', String(reducedMotion));
    setReducedMotion(reducedMotion);
    reducedMotionToggle.addEventListener('change', e => {
      const on = !!e.target.checked;
      reducedMotionToggle.setAttribute('aria-checked', String(on));
      setReducedMotion(on);
    });
    document.addEventListener('i18n:changed', () => updateReducedMotionStatus(reducedMotionToggle.checked));
  }
}

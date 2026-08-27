import { api, onEvent } from '../core/api.js';

export function initLauncherBanner() {
  const banner = document.getElementById('launcher-update-banner');
  const text = document.getElementById('banner-text');
  const actions = document.getElementById('banner-actions');
  const updateBtn = document.getElementById('banner-btn-update');
  const dismissBtn = document.getElementById('banner-btn-dismiss');
  const progressWrap = document.getElementById('banner-progress-wrap');
  const progressBar = document.getElementById('banner-prog-bar');
  const progressLabel = document.getElementById('banner-prog-label');

  const show = () => { banner.classList.add('visible'); document.body.classList.add('banner-open'); };
  const hide = () => { banner.classList.remove('visible'); document.body.classList.remove('banner-open'); };

  onEvent('launcher-update-status', data => {
    if (data.type === 'UPDATE_AVAILABLE') {
      text.innerHTML = `UPDATE AVAILABLE — LAUNCHER <span class="banner-version">v${data.version}</span>`;
      updateBtn.textContent = '↓ UPDATE'; updateBtn.disabled = false; actions.style.display='flex'; progressWrap.classList.remove('visible'); show();
    } else if (data.type === 'UPDATE_DOWNLOADED') {
      text.innerHTML = `RESTART TO APPLY UPDATES — LAUNCHER <span class="banner-version">v${data.version}</span>`;
      updateBtn.textContent = '⟳ RESTART'; updateBtn.disabled = false; actions.style.display='flex'; progressWrap.classList.remove('visible'); show();
    } else if (data.type === 'ERROR') hide();
  });
  onEvent('launcher-update-progress', data => {
    text.textContent='DOWNLOADING UPDATE...'; actions.style.display='none'; progressWrap.classList.add('visible'); progressBar.style.width=data.percent+'%'; progressLabel.textContent=data.percent+'%'; show();
  });

  updateBtn?.addEventListener('click', async () => {
    if (updateBtn.textContent.includes('RESTART')) return api.installLauncherUpdate();
    updateBtn.disabled=true; updateBtn.textContent='DOWNLOADING...';
    try { await api.downloadLauncherUpdate(); } catch { hide(); }
  });
  dismissBtn?.addEventListener('click', hide);
  setTimeout(() => api.checkLauncherUpdate().catch(() => {}), 3000);
}

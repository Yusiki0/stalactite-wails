import { api, onEvent } from '../core/api.js';

export function initHome() {
  const btnPlay = document.querySelector('.btn-play');
  const versionDisplay = document.querySelector('.version-tag span');
  const progContainer = document.getElementById('progress-container');
  const progBar = document.getElementById('progress-bar');
  let remoteDownloadUrl = '';

  function updateDynamicTexts() {
    const state = btnPlay?.dataset?.state || 'install';
    const map = { install:'action.install', update:'action.update', play:'action.play', preparing:'action.preparing', downloading:'action.downloading', launching:'action.launching', retry:'action.retry', offline:'action.offline' };
    const key = map[state] || 'action.install';
    if (btnPlay) {
      const label = i18n.t(key).toUpperCase();
      btnPlay.textContent = state === 'downloading' ? `${label} · ${btnPlay.dataset.percent || 0}%` : label;
    }
    btnPlay?.classList.toggle('special-font', ['install','update','play'].includes(state));
  }

  document.addEventListener('i18n:changed', updateDynamicTexts);

  onEvent('update-status', (info) => {
    if (info.type === 'UPDATE_AVAILABLE') {
      remoteDownloadUrl = info.downloadUrl || '';
      if (info.reason === 'INSTALL') {
        btnPlay.dataset.state = 'install';
        versionDisplay.textContent = i18n.t('version.newAvailable', { version: info.remote }).toUpperCase();
      } else {
        btnPlay.dataset.state = 'update';
        versionDisplay.textContent = i18n.t('version.updateAvailable', { version: info.remote }).toUpperCase();
      }
      updateDynamicTexts();
    } else if (info.type === 'UP_TO_DATE') {
      btnPlay.dataset.state = 'play';
      updateDynamicTexts();
      api.getLocalVersion().then(renderLocalVersion);
    } else if (info.type === 'ERROR') {
      btnPlay.dataset.state = 'offline';
      versionDisplay.textContent = i18n.t('version.server_error').toUpperCase();
      updateDynamicTexts();
    }
  });

  onEvent('local-version-response', renderLocalVersion);
  onEvent('download-progress', (data) => {
    const progStatus = document.getElementById('prog-status');
    const progSpeed = document.getElementById('prog-speed');
    const progBytes = document.getElementById('prog-bytes');
    const progEta = document.getElementById('prog-eta');
    if (data.extracting) {
      if (progStatus) progStatus.textContent = i18n.t('status.extracting').toUpperCase();
      if (progSpeed) progSpeed.textContent = '';
      if (progBytes) progBytes.textContent = '';
      if (progEta) progEta.textContent = '';
      progBar.style.width = '100%';
      versionDisplay.textContent = i18n.t('status.extracting').toUpperCase();
      return;
    }
    const { percent = 0, speed, eta, totalBytes, downloadedBytes } = data;
    btnPlay.dataset.state = 'downloading';
    btnPlay.dataset.percent = percent;
    updateDynamicTexts();
    progBar.style.width = percent + '%';
    if (progStatus) progStatus.textContent = i18n.t('status.downloading', { percent }).toUpperCase();
    if (progSpeed) progSpeed.textContent = speed || '';
    if (progBytes && downloadedBytes !== undefined && totalBytes) {
      progBytes.textContent = `${(downloadedBytes/1048576).toFixed(1)} / ${(totalBytes/1048576).toFixed(1)} MB`;
    }
    if (progEta) {
      if (!eta || eta <= 0) progEta.textContent = '';
      else if (eta < 60) progEta.textContent = i18n.t('status.eta_seconds', { s: eta });
      else progEta.textContent = i18n.t('status.eta_minutes', { m: Math.floor(eta/60), s: String(eta%60).padStart(2,'0') });
    }
    versionDisplay.textContent = speed ? `${percent}% · ${speed}` : `${percent}%`;
  });

  onEvent('download-complete', () => {
    progContainer.style.display = 'none';
    btnPlay.disabled = false;
    btnPlay.dataset.state = 'play';
    updateDynamicTexts();
    versionDisplay.textContent = i18n.t('status.install_ok').toUpperCase();
    api.getLocalVersion().then(renderLocalVersion);
  });

  onEvent('download-error', (data) => {
    progContainer.style.display = 'none';
    btnPlay.disabled = false;
    btnPlay.dataset.state = 'retry';
    updateDynamicTexts();
    const message = data?.message ? `\n\n${data.message}` : '';
    alert(`${i18n.t(data?.errorKey || 'error.download')}${message}`);
  });

  onEvent('launch-error', () => {
    btnPlay.disabled = false;
    btnPlay.dataset.state = 'play';
    updateDynamicTexts();
    alert(i18n.t('error.launch_crash'));
  });

  btnPlay?.addEventListener('click', async () => {
    const state = btnPlay.dataset.state;
    if (state === 'install' || state === 'update' || state === 'retry') {
      if (!remoteDownloadUrl) {
        const status = await api.checkForUpdates();
        if (status?.downloadUrl) remoteDownloadUrl = status.downloadUrl;
      }
      btnPlay.dataset.state = 'preparing';
      btnPlay.disabled = true;
      updateDynamicTexts();
      progContainer.style.display = 'block';
      progBar.style.width = '0%';
      try { await api.startDownload(remoteDownloadUrl); }
      catch { /* backend emits the user-facing error event */ }
    } else if (state === 'play') {
      btnPlay.dataset.state = 'launching';
      btnPlay.disabled = true;
      updateDynamicTexts();
      try { await api.launchGame(); }
      catch { btnPlay.dataset.state = 'play'; btnPlay.disabled = false; updateDynamicTexts(); }
      setTimeout(() => {
        if (btnPlay.dataset.state === 'launching') {
          btnPlay.dataset.state = 'play'; btnPlay.disabled = false; updateDynamicTexts();
        }
      }, 5000);
    }
  });

  document.getElementById('btn-open-folder')?.addEventListener('click', async () => {
    document.getElementById('burger-menu')?.classList.remove('open');
    if (btnPlay.dataset.state !== 'play') return alert(i18n.t('alert.not_installed_folder'));
    try { await api.openGameFolder(); } catch { alert(i18n.t('alert.not_installed_folder')); }
  });

  document.getElementById('btn-uninstall')?.addEventListener('click', async () => {
    document.getElementById('burger-menu')?.classList.remove('open');
    if (btnPlay.dataset.state !== 'play') return alert(i18n.t('alert.not_installed_uninstall'));
    if (!confirm(i18n.t('alert.confirm_uninstall'))) return;
    try { await api.uninstallGame(); } catch { alert(i18n.t('alert.uninstall_error')); }
  });

  onEvent('uninstall-complete', () => {
    btnPlay.dataset.state = 'install';
    updateDynamicTexts();
    versionDisplay.textContent = i18n.t('version.current').toUpperCase();
    api.checkForUpdates().then(handleInitialStatus);
  });

  onEvent('uninstall-error', () => alert(i18n.t('alert.uninstall_error')));

  api.getLocalVersion().then(renderLocalVersion).catch(() => {});
  api.checkForUpdates().then(handleInitialStatus).catch(() => {});
  api.getLauncherVersion().then(v => { const el=document.getElementById('launcher-ver'); if(el) el.textContent='LAUNCHER v'+v; });

  function handleInitialStatus(info) {
    if (!info) return;
    if (info.type === 'UPDATE_AVAILABLE') {
      remoteDownloadUrl = info.downloadUrl || '';
      btnPlay.dataset.state = info.reason === 'INSTALL' ? 'install' : 'update';
      versionDisplay.textContent = info.reason === 'INSTALL'
        ? i18n.t('version.newAvailable', {version: info.remote}).toUpperCase()
        : i18n.t('version.updateAvailable', {version: info.remote}).toUpperCase();
    } else if (info.type === 'UP_TO_DATE') btnPlay.dataset.state = 'play';
    else if (info.type === 'ERROR') { btnPlay.dataset.state='offline'; versionDisplay.textContent=i18n.t('version.server_error').toUpperCase(); }
    updateDynamicTexts();
  }

  function renderLocalVersion(data) {
    const version = data?.version || '0.0.0';
    const status = data?.status || '';
    versionDisplay.textContent = `V.${version} [${status}]`.toUpperCase();
    if (version === '0.0.0') btnPlay.dataset.state = 'install';
    else if (!['install','update','preparing','launching'].includes(btnPlay.dataset.state)) btnPlay.dataset.state = 'play';
    updateDynamicTexts();
  }
}

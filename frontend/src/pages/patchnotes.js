const PATCHNOTES_URL = 'https://api.jsonbin.io/v3/b/695badfe43b1c97be91a7e3e/latest?meta=false';

export function initPatchnotes() {
  const list = document.getElementById('updates-list');
  const error = document.getElementById('updates-error');
  if (!list || !error) return;

  const fetchPatchnotes = async () => {
    error.style.display = 'none';
    list.innerHTML = `<div class="empty-state">${i18n.t('updates.loading')}</div>`;
    try {
      const resp = await fetch(PATCHNOTES_URL, { cache: 'no-store' });
      if (!resp.ok) throw new Error('fetch-failed');
      renderPatchNotes(await resp.json());
    } catch {
      list.innerHTML = `<div class="empty-state empty-state--error">${i18n.t('updates.offline_message')}</div>`;
      error.style.display = 'block';
    }
  };

  fetchPatchnotes();
  return fetchPatchnotes;

  function renderPatchNotes(entries) {
    if (!Array.isArray(entries) || !entries.length) return void (list.innerHTML=`<div class="empty-state">${i18n.t('updates.no_entries')}</div>`);
    list.innerHTML = entries.map((en, index) => {
      const notes = Array.isArray(en.notes) ? `<ul>${en.notes.map(n=>`<li>> ${n}</li>`).join('')}</ul>` : `<div>${en.notes||''}</div>`;
      const latest = index === 0 ? `<span class="update-latest">${i18n.t('updates.latest')}</span>` : '';
      return `<div class="update-item"><div class="update-header"><span class="ver-badge">[${en.version||''}]</span><span class="ver-title">${en.title||''}</span>${latest}<span class="ver-date">${en.date||''}</span></div><div class="update-body">${notes}</div></div>`;
    }).join('');
  }
}

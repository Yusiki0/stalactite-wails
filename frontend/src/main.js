import './core/i18n.js';
import './core/snowstorm.js';
import { initNavigation } from './components/navigation.js';
import { initWindowControls } from './components/window.js';
import { initLauncherBanner } from './components/banner.js';
import { initHome } from './pages/home.js';
import { initPatchnotes } from './pages/patchnotes.js';
import { initSettings } from './pages/settings.js';
import { initCredits } from './pages/credits.js';

// Fonction pour synchroniser le texte du bouton avec le CSS
const syncBtnText = () => {
  const play = document.querySelector('.btn-play');
  if (play) {
    // On met à jour une variable CSS --btn-label avec le contenu textuel actuel
    play.style.setProperty('--btn-label', `"${play.textContent.replace(/"/g, '\\"')}"`);
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.setLocale(localStorage.getItem('locale') || 'fr');
  
  const refreshPatchnotes = initPatchnotes();
  initNavigation({ onPageOpen: target => {
    if (target === 'updates') refreshPatchnotes?.();
  } });
  initWindowControls();
  initHome();
  initSettings();
  initCredits();
  initLauncherBanner();

  const play = document.querySelector('.btn-play');
  
  if (play) {
    const updateLabel = () => {
      play.style.setProperty('--btn-label', `"${play.textContent.replace(/"/g, '\\"')}"`);
    };

    // 1. Première mise à jour
    updateLabel();

    // 2. Observer les changements de texte (pour i18n asynchrone)
    const observer = new MutationObserver(updateLabel);
    observer.observe(play, { childList: true, characterData: true, subtree: true });
  }

  play?.addEventListener('mouseup', () => {
    if (play.disabled) return;
    play.classList.remove('bouncing'); void play.offsetWidth; play.classList.add('bouncing');
    const end = () => { play.classList.remove('bouncing'); play.removeEventListener('animationend', end); };
    play.addEventListener('animationend', end);
  });
});

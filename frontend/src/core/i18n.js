(function(){
  const i18n = {
    locale: 'fr',
    locales: {},
    async load(locale) {
      if (this.locales[locale]) return this.locales[locale];
      try {
        const resp = await fetch(`/locales/${locale}.json`);
        if (!resp.ok) throw new Error('fetch failed');
        const json = await resp.json();
        this.locales[locale] = json;
        return json;
      } catch (e) {
        console.warn('i18n: failed to load locale', locale, e);
        this.locales[locale] = {};
        return this.locales[locale];
      }
    },
    t(key, vars) {
      const obj = this.locales[this.locale] || {};
      const parts = key.split('.');
      let v = parts.reduce((acc, p) => (acc && typeof acc === 'object' ? acc[p] : undefined), obj);
      if (v === undefined) {
        console.warn(`i18n: missing key ${key} for locale ${this.locale}`);
        return key;
      }
      if (vars && typeof vars === 'object') {
        Object.keys(vars).forEach(k => {
          v = v.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), vars[k]);
        });
      }
      return v;
    },
    apply(root = document) {
      // data-i18n and data-i18n-html -> set textContent or innerHTML respectively
      root.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-html');
        if (!key) return;
        const val = this.t(key);

        // If the translation is an array and element is a list, render <li>
        if (Array.isArray(val) && (el.tagName === 'UL' || el.tagName === 'OL')) {
          el.innerHTML = val.map(item => `<li>${item}</li>`).join('');
          return;
        }

        // If html mode is requested, use innerHTML; else textContent
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = Array.isArray(val) ? val.join('<br>') : val;
        } else {
          // If val is an object/array but not for lists, convert to readable text
          if (Array.isArray(val)) el.textContent = val.join(', ');
          else if (typeof val === 'object') el.textContent = JSON.stringify(val);
          else el.textContent = val;
        }
      });

      // data-i18n-attr="key:attr[,key2:attr2]"
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const spec = el.getAttribute('data-i18n-attr');
        if (!spec) return;
        const parts = spec.split(',').map(s => s.trim());
        parts.forEach(pair => {
          const [k, attr] = pair.split(':').map(s => s.trim());
          if (!k || !attr) return;
          const text = this.t(k);
          el.setAttribute(attr, text);
        });
      });
    }, 
    async setLocale(locale) {
      await this.load(locale);
      this.locale = locale;
      this.apply();
      try { localStorage.setItem('locale', locale); } catch (e){}

      document.querySelectorAll('[data-language-picker]').forEach(picker => {
        const selected = picker.querySelector(`[data-language-option][data-locale="${locale}"]`);
        const value = picker.querySelector('.language-picker-value');
        picker.dataset.locale = locale;
        if (selected && value) value.textContent = selected.dataset.label || selected.textContent;
        picker.querySelectorAll('[data-language-option]').forEach(option => {
          option.setAttribute('aria-selected', String(option.dataset.locale === locale));
        });
      });

      // Notify the app that locale changed so dynamic texts can update
      try { document.dispatchEvent(new Event('i18n:changed')); } catch (e) {}
      return locale;
    },

    getLocale() { return this.locale; }
  };

  // Expose
  window.i18n = {
    t: (k, v) => i18n.t(k, v),
    setLocale: (l) => i18n.setLocale(l),
    getLocale: () => i18n.getLocale(),
    applyTranslations: () => i18n.apply()
  };

  // Auto-initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', async () => {
    const saved = (localStorage && localStorage.getItem && localStorage.getItem('locale')) || 'fr';
    await i18n.load('fr');
    // load selected locale too
    if (saved !== 'fr') await i18n.load(saved);
    await i18n.setLocale(saved);

    document.querySelectorAll('[data-language-picker]').forEach(picker => {
      const trigger = picker.querySelector('.language-picker-trigger');
      const options = picker.querySelectorAll('[data-language-option]');
      const close = () => {
        picker.classList.remove('open');
        trigger?.setAttribute('aria-expanded', 'false');
      };

      trigger?.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = picker.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(isOpen));
      });
      options.forEach(option => option.addEventListener('click', async () => {
        await i18n.setLocale(option.dataset.locale);
        close();
      }));
      picker.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          close();
          trigger?.focus();
        }
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('[data-language-picker].open').forEach(picker => {
        picker.classList.remove('open');
        picker.querySelector('.language-picker-trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
  });
})();

const avatarAssets = import.meta.glob('../../assets/avatars/*.{png,gif}', { eager: true, as: 'url' });
const avatarMap = Object.fromEntries(Object.entries(avatarAssets).map(([path, url]) => {
  const filename = path.split('/').pop().replace(/\.(png|gif)$/i, '');
  return [filename, url];
}));
avatarMap['The Cool Artist'] = avatarMap.The_Cool_Artist;
avatarMap['Noé'] = avatarMap.Noe;
avatarMap['Dark Rider'] = avatarMap.Dark_Rider;

export function initCredits(){
  const render=()=>{ const c=document.getElementById('credits-tags-container'); if(!c||!window.i18n)return; const names=window.i18n.t('credits.contributors.names'); const arr=Array.isArray(names)?names:[names]; c.innerHTML=arr.map(name=>{const src=avatarMap[name]||''; const initials=name.replace(/_/g,' ').split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2); return `<div class="credits-person"><div class="credits-person-avatar">${src?`<img src="${src}" class="credits-person-img" alt="${name}"><div class="credits-person-initials" style="display:none">${initials}</div>`:`<div class="credits-person-initials">${initials}</div>`}</div><div class="credits-person-name">${name}</div></div>`}).join(''); };
  document.addEventListener('i18n:changed',render); setTimeout(render,300);
}

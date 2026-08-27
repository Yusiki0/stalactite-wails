export function initNavigation({ onPageOpen } = {}) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page-content');
  navButtons.forEach(btn => btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.route;
    pages.forEach(page => page.classList.toggle('active', page.id === target));
    onPageOpen?.(target);
  }));

  const burger = document.getElementById('btn-burger');
  const menu = document.getElementById('burger-menu');
  burger?.addEventListener('click', e => { e.stopPropagation(); menu?.classList.toggle('open'); });
  document.addEventListener('click', () => menu?.classList.remove('open'));
  menu?.addEventListener('click', e => e.stopPropagation());
}

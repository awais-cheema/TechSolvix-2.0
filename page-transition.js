(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  if (!motion.matches) return;

  const homepage = document.currentScript?.getAttribute('src') === './page-transition.js';
  let firstHomepage = homepage;
  if (homepage) {
    try {
      firstHomepage = sessionStorage.getItem('techsolvix-home-intro') !== 'seen';
      sessionStorage.setItem('techsolvix-home-intro', 'seen');
    } catch { /* Local previews may block session storage. */ }
  }
  root.classList.toggle('home-intro', firstHomepage);
  root.classList.add('transition-entering');
  const started = performance.now();
  let navigating = false;
  function reveal() {
    root.classList.remove('transition-entering', 'transition-leaving');
    root.classList.add('transition-revealed');
    navigating = false;
  }

  function waitForHero() {
    const video = document.querySelector('#home .hero-bg video');
    if (!video) return Promise.resolve();
    return new Promise(resolve => {
      let settled = false;
      const finish = decoded => {
        if (decoded) video.classList.add('hero-frame-ready');
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        // Give the first frame or poster a paint before lifting the curtain.
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      };
      const timeout = setTimeout(() => finish(false), 6000);
      video.addEventListener('loadeddata', () => finish(true), { once: true });
      video.addEventListener('error', () => {
        video.classList.remove('hero-frame-ready');
        finish(false);
      }, { once: true });
      if (video.readyState >= 2) finish(true);
      else if (video.error) finish(false);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const fonts = document.fonts?.ready ?? Promise.resolve();
    await Promise.all([
      waitForHero(),
      Promise.race([fonts.catch(() => {}), new Promise(resolve => setTimeout(resolve, 650))]),
    ]);
    setTimeout(reveal, Math.max(0, (firstHomepage ? 2350 : 480) - (performance.now() - started)));
  }, { once: true });
  // Restore the page if the browser returns it from its back/forward cache.
  addEventListener('pageshow', (event) => { if (event.persisted) reveal(); });
  motion.addEventListener('change', (event) => { if (!event.matches) reveal(); });

  document.addEventListener('click', (event) => {
    if (!motion.matches || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#')) return;
    const next = new URL(link.href, location.href);
    if (next.origin !== location.origin || next.protocol !== location.protocol) return;
    if (!['http:', 'https:', 'file:'].includes(next.protocol)) return;
    if (next.pathname === location.pathname && next.search === location.search) return;
    if (next.protocol === 'file:' && !next.pathname.endsWith('.html')) return;
    if (/\.(?!html?$)[a-z0-9]+$/i.test(next.pathname)) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    root.classList.add('transition-leaving');
    const jump = () => {
      if (!navigating) return;
      location.assign(next.href);
    };
    const cover = document.querySelector('.page-transition');
    cover.addEventListener('transitionend', function onCover(event) {
      if (event.target !== cover || event.propertyName !== 'clip-path') return;
      cover.removeEventListener('transitionend', onCover);
      clearTimeout(fallback);
      jump();
    });
    const fallback = setTimeout(jump, 510);
  });
})();

'use strict';

const find = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const narrow = matchMedia('(max-width: 1099px)');
const page = find('.page');
const nav = find('.nav');
const menu = find('.menu');
const menuToggle = find('.n-toggle');
const reel = find('.showreel');
const reelVideo = find('.showreel-video');
let activeOverlay = '';
let restoreFocus;

function activate(element, label, handler) {
  if (!element) return;
  if (label) element.setAttribute('aria-label', label);
  if (!element.matches('a, button, input, select, textarea')) {
    element.setAttribute('role', 'button');
    element.tabIndex = 0;
    element.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      element.click();
    });
  }
  element.addEventListener('click', handler);
}
function overlay(next) {
  if (!activeOverlay && next) restoreFocus = document.activeElement;
  activeOverlay = next;
  for (const name of ['menu', 'showreel']) {
    document.body.classList.toggle(name + '-active', name === next);
  }
  menu.inert = next !== 'menu';
  reel.inert = next !== 'showreel';
  page.inert = Boolean(next);
  nav.inert = Boolean(next);
  menuToggle.setAttribute('aria-expanded', String(next === 'menu'));
  if (next !== 'showreel') reelVideo.pause();
  const first = {
    menu: find('.m-close'),
    showreel: find('.showreel-close'),
  }[next];
  if (next && first) first.focus({ preventScroll: true });
  if (!next && restoreFocus) {
    restoreFocus.focus({ preventScroll: true });
    restoreFocus = null;
  }
}

menu.setAttribute('role', 'dialog');
reel.setAttribute('role', 'dialog');
for (const [dialog, label] of [[menu, 'Navigation'], [reel, 'Showreel']]) {
  dialog.setAttribute('aria-label', label);
  dialog.setAttribute('aria-modal', 'true');
}
activate(menuToggle, 'Open menu', () => overlay('menu'));
activate(find('.m-close'), 'Close menu', () => overlay(''));
activate(find('.showreel-close'), 'Close showreel', () => overlay(''));
for (const trigger of all('.m-showreel .btn, .m-showreel .btn-block-link, .exp .btn-block .btn, .exp .btn-block-link')) {
  activate(trigger, 'Play showreel', (event) => {
    event.preventDefault();
    overlay('showreel');
    if (!reelVideo.hasAttribute('src')) reelVideo.src = reelVideo.dataset.showreelSrc;
    reelVideo.play().catch(() => {});
  });
}
const playToggle = find('.showreel-toggle');
activate(playToggle, 'Play or pause showreel', () => {
  if (!reelVideo.hasAttribute('src')) reelVideo.src = reelVideo.dataset.showreelSrc;
  if (reelVideo.paused) reelVideo.play().catch(() => {});
  else reelVideo.pause();
});
reelVideo.controls = true;
reelVideo.playsInline = true;
document.addEventListener('keydown', (event) => {
  if (!activeOverlay) return;
  if (event.key === 'Escape') {
    overlay('');
  } else if (event.key === 'Tab') {
    const active = { menu, showreel: reel }[activeOverlay];
    const focusable = all('a[href], button, input, textarea, select, [tabindex="0"]', active).filter((node) => node.getClientRects().length && !node.disabled);
    if (!focusable.length) return;
    const target = event.shiftKey ? focusable.at(-1) : focusable[0];
    const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
    if (document.activeElement === edge) {
      event.preventDefault();
      target.focus();
    }
  }
});
overlay('');

const videoObserver = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting && motion.matches) {
      if (!target.hasAttribute('src')) target.src = target.dataset.localVideo;
      target.play().catch(() => {});
    } else if (!target.paused) {
      target.pause();
    }
  }
}, { rootMargin: '220px 0px' });
all('[data-local-video]').forEach((video) => videoObserver.observe(video));

const clocks = all('.clock-time');
if (clocks.length) {
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', timeStyle: 'medium' });
  const tick = () => clocks.forEach((clock) => { clock.textContent = formatter.format(new Date()); });
  tick();
  setInterval(tick, 1000);
}

const faqs = all('.faq');
faqs.forEach((faq, index) => {
  const toggle = find('.faq-toggle', faq);
  const answer = find('.faq-answer-wrapper', faq);
  const answerId = 'faq-answer-' + index;
  answer.id = answerId;
  toggle.setAttribute('aria-controls', answerId);
  const set = (open) => {
    faq.classList.toggle('active', open);
    answer.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  set(false);
  activate(toggle, find('.faq-question', faq).textContent.trim(), () => {
    const open = !faq.classList.contains('active');
    if (!faq.closest('#home')) faqs.forEach((other) => {
      if (other === faq) return;
      other.classList.remove('active');
      find('.faq-answer-wrapper', other).inert = true;
      find('.faq-toggle', other).setAttribute('aria-expanded', 'false');
    });
    set(open);
  });
});

for (const carousel of all('.carousel')) {
  const track = find('.carousel-inner', carousel);
  if (!track) continue;
  if (carousel.closest('#home .testimonials')) continue;
  const slides = all('.carousel-item', track);
  const step = (direction) => {
    if (slides.length < 2) return;
    const width = slides[1].offsetLeft - slides[0].offsetLeft || slides[0].offsetWidth;
    const last = track.scrollWidth - track.clientWidth;
    let next = Math.max(0, Math.min(last, track.scrollLeft + direction * width));
    if (direction > 0 && track.scrollLeft >= last - 2) next = 0;
    if (direction < 0 && track.scrollLeft <= 2) next = last;
    track.scrollTo({ left: next, behavior: motion.matches ? 'smooth' : 'instant' });
  };
  activate(find('.carousel-prev', carousel), 'Previous slide', () => step(-1));
  activate(find('.carousel-next', carousel), 'Next slide', () => step(1));
  track.tabIndex = 0;
  track.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  });
}

const filter = find('.work-filter');
if (filter) {
  const caption = find('.work-filter-select-text', filter);
  const options = all('.work-filter-btn', filter);
  const select = find('select', filter);
  const grid = find('.work-grid');
  const list = find('.work-list');
  const switchers = all('.work-switcher-option');
  const projects = all('.work-grid .project, .work-list .project');
  function setFilter(value) {
    caption.textContent = options.find((button) => button.dataset.value === value)?.dataset.title || 'Work filter';
    select.value = value;
    options.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === value)));
    for (const project of projects) {
      const tags = (project.dataset.services || '').replaceAll('"', '').split(',');
      project.hidden = value !== 'all' && !tags.includes(value);
    }
    filter.classList.remove('active');
    caption.setAttribute('aria-expanded', 'false');
  }
  caption.addEventListener('click', () => caption.setAttribute('aria-expanded', String(filter.classList.toggle('active'))));
  find('.work-filter-select-close', filter).addEventListener('click', () => setFilter('all'));
  options.forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.value)));
  select.addEventListener('change', () => setFilter(select.value));
  switchers.forEach((button) => button.addEventListener('click', () => {
    const listMode = button.dataset.value === 'list';
    for (const [view, shown] of [[list, listMode], [grid, !listMode]]) {
      view.hidden = !shown;
      view.classList.toggle('active', shown);
      view.classList.add('loaded');
    }
    switchers.forEach((option) => {
      option.classList.toggle('active', option === button);
      option.setAttribute('aria-pressed', String(option === button));
    });
  }));
  list.hidden = true;
  setFilter('all');
}

for (const col of all('.work-col-project')) {
  if (col.closest('#home')) continue;
  const set = (active) => col.classList.toggle('active', active);
  col.addEventListener('pointerenter', () => set(true));
  col.addEventListener('pointerleave', () => set(false));
  col.addEventListener('focusin', () => set(true));
  col.addEventListener('focusout', () => set(false));
}
for (const button of all('.work .btn-view')) {
  const section = button.closest('.work');
  let target;
  for (const column of all('.work-col-project', section)) {
    const remember = () => { target = find('a.work-link', column); };
    column.addEventListener('pointerenter', remember);
    column.addEventListener('focusin', remember);
  }
  button.addEventListener('click', () => {
    (target || find('.work-col-project a.work-link', section))?.click();
  });
}
for (const person of all('.team-member')) {
  person.addEventListener('pointerenter', () => person.classList.add('active'));
  person.addEventListener('pointerleave', () => person.classList.remove('active'));
  person.addEventListener('focusin', () => person.classList.add('active'));
}
for (const form of all('[data-static-form]')) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = 'Project enquiry';
    const lines = [...data]
      .filter(([key, value]) => !['extra', 'ts'].includes(key) && value)
      .map(([key, value]) => key.replaceAll('_', ' ') + ': ' + value);
    let status = find('.static-status', form);
    if (!status) {
      status = document.createElement('p');
      status.className = 'static-status';
      status.setAttribute('role', 'status');
      form.append(status);
    }
    status.textContent = 'Send the draft from your email app to complete your request.';
    location.href = 'mailto:info@techsolvix.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  });
}

const themedSections = all('main [data-theme]');
const footer = find('.footer');
let requestedFrame = 0;
function updateScroll() {
  requestedFrame = 0;
  let theme = 'dark';
  for (const section of themedSections) {
    const bounds = section.getBoundingClientRect();
    if (bounds.height && bounds.top <= 64 && bounds.bottom > 64) theme = (narrow.matches && section.dataset.themeMobile) || section.dataset.theme;
  }
  nav.dataset.theme = theme;

}
function scheduleScroll() {
  if (!requestedFrame) requestedFrame = requestAnimationFrame(updateScroll);
}
addEventListener('scroll', scheduleScroll, { passive: true });
addEventListener('resize', scheduleScroll, { passive: true });
if (footer) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) footer.classList.add('static-footer-visible');
  }).observe(footer);
}
const reveals = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (!isIntersecting) continue;
    target.classList.add('static-visible');
    reveals.unobserve(target);
  }
}, { threshold: .11 });
if (motion.matches) {
  for (const title of all('main section h2, main .work-grid-project, main .team-member')) {
    if (title.matches('#home .exp-title, #home .about-title')) continue;
    title.classList.add('static-reveal');
    reveals.observe(title);
  }
}
document.documentElement.classList.add('static-ready');
updateScroll();

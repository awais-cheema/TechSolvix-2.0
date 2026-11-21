(() => {
  'use strict';

  const home = document.querySelector('#home');
  if (!home) return;

  const pick = (selector, parent = home) => parent.querySelector(selector);
  const items = (selector, parent = home) => [...parent.querySelectorAll(selector)];
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));
  const easeOut = (value) => 1 - (1 - value) ** 3;
  const mix = (a, b, t) => a + (b - a) * t;
  const set = (node, property, value) => {
    const next = String(value);
    if (node.style.getPropertyValue(property) !== next) node.style.setProperty(property, next);
  };
  const desktop = matchMedia('(min-width: 1100px)');
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');

  const hero = pick('.hero');
  const heroStage = document.createElement('div');
  heroStage.className = 'home-hero-stage';
  hero.before(heroStage);
  heroStage.append(hero);

  const experience = pick('.exp');
  const expTitle = pick('.exp-title', experience);
  expTitle.replaceChildren(
    Object.assign(document.createElement('span'), { className: 'exp-line', textContent: 'Crafting competitive' }),
    Object.assign(document.createElement('span'), { className: 'exp-line', textContent: 'digital ' }),
  );
  const trailTarget = document.createElement('em');
  trailTarget.className = 'exp-title-hover';
  trailTarget.textContent = 'experiences';
  expTitle.lastElementChild.append(trailTarget);
  const trail = items('.exp-images .media-wrapper', experience);
  let lastPoint;
  let trailIndex = 0;
  let trailDepth = 0;
  const trailAnimations = new WeakMap();
  trailTarget.addEventListener('pointerleave', () => { lastPoint = undefined; });
  trailTarget.addEventListener('pointermove', (event) => {
    if (!(desktop.matches && motion.matches && pointer.matches) || !trail.length) return;
    const previous = lastPoint;
    if (previous && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 60) return;
    lastPoint = { x: event.clientX, y: event.clientY };
    const image = trail[trailIndex++ % trail.length];
    const box = pick('.exp-images', experience).getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const dx = previous ? (event.clientX - previous.x) * .75 : 0;
    const dy = previous ? (event.clientY - previous.y) * .75 : 0;
    const pose = (left, top, scale) => 'translate(' + left + 'px,' + top + 'px) translate(-50%,-50%) scale(' + scale + ')';
    image.style.zIndex = String(++trailDepth);
    trailAnimations.get(image)?.cancel();
    trailAnimations.set(image, image.animate([
      { opacity: 0, transform: pose(x - dx * .25, y - dy * .25, .78), offset: 0 },
      { opacity: 1, transform: pose(x, y, 1), offset: .18 },
      { opacity: 1, transform: pose(x + dx * .32, y + dy * .32, .98), offset: .38 },
      { opacity: 0, transform: pose(x + dx, y + dy, .87), offset: 1 },
    ], { duration: 1180, easing: 'cubic-bezier(.18,.7,.23,1)' }));
  });

  const about = pick('.about');
  const aboutTitle = pick('.about-title', about);
  const aboutImages = items('.about-images .media-wrapper', about);
  if (aboutImages[0]) aboutImages[0].classList.add('about-first');
  const expLines = items('.exp-line', experience);
  const nav = document.querySelector('.nav');

  const work = pick('.work');
  const columns = items('.work-col', work).filter((column) => pick('.work-wrapper', column));
  const workButton = pick('.btn-view', work);
  let currentWork = -1;
  const selectWork = (current, showButton = false) => {
    if (current === currentWork) return;
    currentWork = current;
    const { labelInk, labelSurface } = columns[current].dataset;
    if (labelInk && labelSurface) {
      set(workButton, '--work-label-ink', labelInk);
      set(workButton, '--work-label-surface', labelSurface);
    }
    columns.forEach((column, index) => {
      column.classList.toggle('motion-work-selected', index === current);
      column.classList.toggle('active', index === current);
      column.classList.toggle('motion-work-neighbor', Math.abs(index - current) === 1);
    });
    work.classList.toggle('motion-work-pointer', showButton);
  };
  selectWork(0);
  columns.forEach((column, index) => {
    column.addEventListener('focusin', () => selectWork(index));
  });
  const workGrid = pick('.work-grid', work);
  let pendingWork = 0;
  let nextWork = -1;
  let pointerX = NaN;
  let pointerY = NaN;
  function cancelWork() {
    clearTimeout(pendingWork);
    nextWork = -1;
  }
  workGrid.addEventListener('pointerleave', () => {
    cancelWork();
    pointerX = pointerY = NaN;
    selectWork(0);
  });
  work.addEventListener('focusout', (event) => {
    if (!work.contains(event.relatedTarget)) selectWork(0);
  });
  workGrid.addEventListener('pointermove', (event) => {
    if (!desktop.matches || !pointer.matches) return;
    const {clientX: x, clientY: y} = event;
    if (x === pointerX && y === pointerY) return;
    pointerX = x;
    pointerY = y;
    const box = work.getBoundingClientRect();
    set(workButton, '--work-x', x - box.left + 'px');
    set(workButton, '--work-y', y - box.top + 'px');

    const hit = event.target.closest('.work-col');
    const index = columns.indexOf(hit);
    if (index < 0 || index === currentWork) {
      cancelWork();
      return;
    }
    const {left, right} = hit.getBoundingClientRect();
    if (x <= left + 8 || x >= right - 8) {
      cancelWork();
      return;
    }
    if (nextWork === index) return;
    cancelWork();
    nextWork = index;
    pendingWork = setTimeout(() => {
      nextWork = -1;
      // Layout motion alone cannot switch the selected card.
      const hovered = document.elementFromPoint(pointerX, pointerY)?.closest('.work-col');
      if (hovered === hit) selectWork(index, index > 0);
    }, motion.matches ? 42 : 0);
  });

  for (const block of items('.exp .btn-block, .work .work-col-featured .btn-block')) {
    const button = pick('.btn', block);
    if (!button) continue;
    block.addEventListener('pointermove', (event) => {
      if (!(desktop.matches && motion.matches && pointer.matches)) return;
      const box = block.getBoundingClientRect();
      const scale = box.width / block.offsetWidth || 1;
      set(button, '--magnet-x', (event.clientX - box.left - box.width / 2) / scale + 'px');
      set(button, '--magnet-y', (event.clientY - box.top - box.height / 2) / scale + 'px');
    });
    block.addEventListener('pointerleave', () => {
      set(button, '--magnet-x', '0px');
      set(button, '--magnet-y', '0px');
    });
  }

  const services = pick('.services-inner');
  const serviceRows = items('.service', services);
  function showService(selected) {
    serviceRows.forEach((row, index) => {
      row.classList.toggle('active', index === selected);
      const offset = index * 10.7 + (index > selected ? 14 : 0);
      set(row, '--service-top', offset + 'rem');
    });
  }
  showService(0);
  serviceRows.forEach((row, index) => {
    row.addEventListener('pointerenter', () => {
      if (desktop.matches && pointer.matches) showService(index === serviceRows.length - 1 ? 0 : index);
    });
  });
  services.addEventListener('pointerleave', () => showService(0));

  const testimonials = pick('.testimonials');
  const carousel = pick('.carousel-inner', testimonials);
  const slides = items('.carousel-item', carousel);
  function syncCarousel() {
    const bounds = carousel.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    let current;
    let nearest = Infinity;
    for (const slide of slides) {
      const box = slide.getBoundingClientRect();
      const distance = (box.left + box.width / 2 - center) / Math.max(1, box.width);
      const deviation = clamp(Math.abs(distance));
      if (Math.abs(distance) < nearest) {
        current = slide;
        nearest = Math.abs(distance);
      }
      set(slide, '--card-scale', mix(1, .89, deviation));
      set(slide, '--card-tilt', Math.sign(distance) * -23 * deviation + 'deg');
    }
    slides.forEach((slide) => slide.classList.toggle('current', slide === current));
    return slides.indexOf(current);
  }
  carousel.addEventListener('scroll', syncCarousel, { passive: true });
  const prev = pick('.carousel-prev', testimonials);
  const next = pick('.carousel-next', testimonials);
  const arrow = pick('.carousel-arrow', testimonials);
  function goToSlide(index, smooth) {
    const slide = slides[(index + slides.length) % slides.length];
    if (!slide) return;
    const trackBox = carousel.getBoundingClientRect();
    const slideBox = slide.getBoundingClientRect();
    carousel.scrollTo({
      left: carousel.scrollLeft + slideBox.left - trackBox.left + (slideBox.width - trackBox.width) / 2,
      behavior: smooth && motion.matches ? 'smooth' : 'instant',
    });
  }
  function moveSlide(direction) { goToSlide(syncCarousel() + direction, true); }
  for (const [control, direction] of [[prev, -1], [next, 1]]) {
    if (!control) continue;
    control.setAttribute('role', 'button');
    control.setAttribute('aria-label', direction < 0 ? 'Previous testimonial' : 'Next testimonial');
    control.tabIndex = 0;
    control.addEventListener('click', () => moveSlide(direction));
    control.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      moveSlide(direction);
    });
  }
  carousel.tabIndex = 0;
  carousel.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveSlide(event.key === 'ArrowLeft' ? -1 : 1);
  });
  requestAnimationFrame(() => {
    // Begin with the reference's centered card, with one neighboring card on each side.
    const referenceIndex = slides.findIndex((slide) => slide.textContent.includes('Jason Bagley'));
    goToSlide(referenceIndex >= 0 ? referenceIndex : 0, false);
    syncCarousel();
  });
  testimonials.addEventListener('pointermove', (event) => {
    const target = event.target.closest('.carousel-prev, .carousel-next');
    testimonials.classList.toggle('motion-carousel-pointer', Boolean(target) && pointer.matches);
    if (!target || !arrow) return;
    const box = pick('.carousel', testimonials).getBoundingClientRect();
    set(arrow, '--arrow-x', event.clientX - box.left + 'px');
    set(arrow, '--arrow-y', event.clientY - box.top + 'px');
    arrow.classList.toggle('motion-carousel-prev', target === prev);
  });
  testimonials.addEventListener('pointerleave', () => testimonials.classList.remove('motion-carousel-pointer'));
  [prev, next].forEach((control) => control?.addEventListener('blur', () => testimonials.classList.remove('motion-carousel-pointer')));

  for (const area of [...document.querySelectorAll('.nav .n-logo, .nav .n-links, .nav .n-toggle'), ...items('.faq, .testimonial')]) {
    area.addEventListener('pointermove', (event) => {
      if (!pointer.matches) return;
      const box = area.getBoundingClientRect();
      set(area, '--glow-x', event.clientX - box.left + 'px');
      set(area, '--glow-y', event.clientY - box.top + 'px');
    });
  }

  const prefooter = pick('.pre-footer');
  let raf = 0;
  function render() {
    raf = 0;
    const vh = Math.max(1, innerHeight);
    const animated = motion.matches;
    const wide = desktop.matches;
    const expanded = scrollY <= 100 || nav.matches(':focus-within');
    document.documentElement.classList.toggle('scrolled', scrollY > 100);
    nav.classList.toggle('motion-nav-compact', !expanded);
    const navLinks = nav.querySelector('.n-links');
    if (navLinks) navLinks.inert = !expanded && wide;

    if (animated) {
      const heroProgress = clamp(-heroStage.getBoundingClientRect().top / vh);
      const expTop = experience.getBoundingClientRect().top;
      const aboutBox = about.getBoundingClientRect();
      const imageBox = pick('.about-images', about).getBoundingClientRect();
      const testBox = testimonials.getBoundingClientRect();
      const footerBox = prefooter.getBoundingClientRect();
      set(hero, '--hero-progress', heroProgress);
      set(hero, '--hero-fade', 1 - heroProgress);
      set(hero, '--hero-spread', easeOut(heroProgress));
      if (wide) {
        const reelProgress = range(-expTop / vh, -.95, .7);
        set(experience, '--reel-scale', 1 - .5 * reelProgress);
        set(experience, '--reel-drift', 33 * range(-expTop / vh, -.35, .7) ** 2 + 'vh');
        const story = range(-expTop / vh, .72, 3.65);
        set(experience, '--exp-title-y', (1 - range(story, 0, .42)) * 32 - 70 * range(story, .65, 1) ** 2 + 'vh');
        set(experience, '--exp-subtitle-y', mix(75, -100, range(story, .29, .99)) + 'vh');
        set(experience, '--exp-copy-y', mix(112, -100, range(story, .33, .98)) + 'vh');
        expLines.forEach((line, index) => {
          const appear = range(story, .035 + index * .06, .46 + index * .06);
          set(line, '--line-alpha', appear);
          set(line, '--line-y', (1 - appear) * 90 + '%');
          set(line, '--line-blur', (1 - appear) * 16 + 'px');
        });
      }

      const sequence = wide ? range(-aboutBox.top / vh, -.33, 2.5) : range(imageBox.top / vh, .9, -.15);
      set(about, '--about-copy-y', mix(66, -86, sequence) + 'vh');
      set(about, '--about-title-y', mix(15, 0, easeOut(range(sequence, 0, .2))) - 125 * range(sequence, .55, .95) ** 2 + 'vh');
      set(aboutTitle, '--about-alpha', easeOut(range(sequence, 0, .15)));
      aboutImages.forEach((image, index) => {
        const show = index === 0 ? 1 : range(sequence, .22 + index * .16, .38 + index * .16);
        set(image, '--about-mask', (1 - show) * 100 + '%');
        set(image, '--about-scale', mix(1.2, 1, easeOut(range(sequence, .1 + index * .13, .43 + index * .13))));
      });

      set(testimonials, '--test-parallax', mix(-8, 8, range(testBox.top, vh, -testBox.height)) + '%');
      set(prefooter, '--footer-mask', range(-footerBox.top, 0, footerBox.height) * 100 + '%');
      set(prefooter, '--footer-scale', mix(1.2, 1, range(footerBox.top, vh, -footerBox.height)));
    }
  }
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };
  // Keep native touch, keyboard, scrollbar and carousel scrolling.
  let wheelFrame = 0;
  let wheelTarget = 0;
  function cancelWheel() {
    cancelAnimationFrame(wheelFrame);
    wheelFrame = 0;
  }
  function animateWheel() {
    const delta = wheelTarget - scrollY;
    if (Math.abs(delta) < 1) {
      scrollTo({ top: wheelTarget, behavior: 'instant' });
      wheelFrame = 0;
      return;
    }
    scrollTo({ top: scrollY + Math.sign(delta) * Math.max(1, Math.abs(delta) * .13), behavior: 'instant' });
    wheelFrame = requestAnimationFrame(animateWheel);
  }
  addEventListener('wheel', (event) => {
    if (!desktop.matches || !motion.matches || event.ctrlKey || event.shiftKey ||
        !event.cancelable || Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
        document.body.matches('.menu-active, .showreel-active') ||
        event.target.closest('textarea, select, [contenteditable], .carousel-inner')) return;
    const limit = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (!limit) return;
    event.preventDefault();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    wheelTarget = Math.min(limit, Math.max(0, (wheelFrame ? wheelTarget : scrollY) + event.deltaY * multiplier));
    if (!wheelFrame) wheelFrame = requestAnimationFrame(animateWheel);
  }, { passive: false });
  addEventListener('keydown', cancelWheel, { passive: true });
  addEventListener('pointerdown', cancelWheel, { passive: true });
  motion.addEventListener('change', cancelWheel);
  desktop.addEventListener('change', cancelWheel);

  home.classList.add('home-motion-ready');
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { schedule(); syncCarousel(); }, { passive: true });
  desktop.addEventListener('change', schedule);
  motion.addEventListener('change', schedule);
  nav.addEventListener('focusin', schedule);
  nav.addEventListener('focusout', schedule);
  schedule();
  syncCarousel();
})();

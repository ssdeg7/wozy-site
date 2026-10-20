/* ==========================================================================
   Odyz — site behaviour. No dependencies, no build step.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById('nav-toggle');
  var links  = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Nav shadow on scroll ---------- */
  var navWrap = document.querySelector('.nav-wrap');
  var onScroll = function () {
    if (navWrap) navWrap.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealables = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealables.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      revealObserver.observe(el);
    });
  }

  /* ---------- Scroll-spy for the nav pill ---------- */
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 3D story: swap the phone screen as steps scroll past ---------- */
  var steps  = Array.prototype.slice.call(document.querySelectorAll('[data-story-step]'));
  var shots  = Array.prototype.slice.call(document.querySelectorAll('[data-story-img]'));

  if (steps.length && shots.length && 'IntersectionObserver' in window) {
    var setStep = function (index) {
      steps.forEach(function (s) { s.classList.toggle('is-active', s.dataset.storyStep === index); });
      shots.forEach(function (s) { s.classList.toggle('is-active', s.dataset.storyImg === index); });
    };

    var storyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setStep(entry.target.dataset.storyStep);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    steps.forEach(function (s) { storyObserver.observe(s); });
    setStep('0');
  }

  /* ---------- Stamp marquee columns ----------
     Stamps are filled in from JS — add a file to assets/stamps/ and
     put its name in the list below. */
  var STAMPS = [
    'agra', 'berlin', 'buenosaires', 'cairo', 'dubai', 'istanbul',
    'la', 'newyork', 'rio', 'rome', 'sf', 'singapore'
  ];
  var STAMPS_PER_COLUMN = 5;

  var columns = document.querySelectorAll('.stamps-col');
  columns.forEach(function (col, colIndex) {
    var inner = document.createElement('div');
    inner.className = 'stamps-col-inner';

    // Two passes of the same set makes the loop seamless at -50%.
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < STAMPS_PER_COLUMN; i++) {
        var name = STAMPS[(colIndex * STAMPS_PER_COLUMN + i) % STAMPS.length];
        var img = document.createElement('img');
        img.src = 'assets/stamps/' + name + '.webp';
        img.alt = '';
        img.loading = 'lazy';
        inner.appendChild(img);
      }
    }

    if (!reduceMotion) {
      var speed = col.dataset.speed || 30;
      var dir = col.hasAttribute('data-reverse') ? 'marquee-down' : 'marquee-up';
      inner.style.animation = dir + ' ' + speed + 's linear infinite';
    }

    col.appendChild(inner);
  });

  /* ---------- Duplicate review cards so the row loops seamlessly ---------- */
  var track = document.querySelector('.reviews-track');
  if (track && !reduceMotion) {
    track.innerHTML += track.innerHTML;
    Array.prototype.slice.call(track.children).forEach(function (li, i, all) {
      if (i >= all.length / 2) li.setAttribute('aria-hidden', 'true');
    });
  }

  /* ---------- Accordion: only one answer open at a time ---------- */
  var accItems = document.querySelectorAll('.acc-item');
  accItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      accItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });
})();

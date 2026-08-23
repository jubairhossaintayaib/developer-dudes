(function () {
  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  var mobileLinks = document.querySelectorAll('.mobile-nav a');

  if (mobileNav) mobileNav.setAttribute('inert', '');

  var mobileGroups = document.querySelectorAll('.mobile-nav-group');
  function closeMobileGroups() {
    mobileGroups.forEach(function (group) {
      group.classList.remove('is-open');
      var toggle = group.querySelector('.mobile-nav-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var isOpen = header.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (mobileNav) mobileNav.toggleAttribute('inert', !isOpen);
      if (!isOpen) closeMobileGroups();
    });
  }

  mobileGroups.forEach(function (group) {
    var toggle = group.querySelector('.mobile-nav-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var isOpen = group.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      header.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      if (mobileNav) mobileNav.setAttribute('inert', '');
      closeMobileGroups();
    });
  });

  var navDropdowns = document.querySelectorAll('.nav-dropdown');
  navDropdowns.forEach(function (dd) {
    var trigger = dd.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dd.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navDropdowns.forEach(function (other) {
        if (other !== dd) {
          other.classList.remove('is-open');
          var otherTrigger = other.querySelector('.nav-dropdown-trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });
  if (navDropdowns.length) {
    document.addEventListener('click', function (e) {
      navDropdowns.forEach(function (dd) {
        if (!dd.contains(e.target)) {
          dd.classList.remove('is-open');
          var trigger = dd.querySelector('.nav-dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      navDropdowns.forEach(function (dd) {
        dd.classList.remove('is-open');
        var trigger = dd.querySelector('.nav-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var lightbox = document.getElementById('portfolio-lightbox');
  if (lightbox) {
    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lightboxTitle = lightbox.querySelector('.lightbox-title');
    var lightboxClose = lightbox.querySelector('.lightbox-close');
    var lightboxScroll = lightbox.querySelector('.lightbox-scroll');
    var triggers = document.querySelectorAll('[data-lightbox-trigger]');
    var lastTrigger = null;

    function openLightbox(trigger) {
      lastTrigger = trigger;
      lightboxImg.src = trigger.getAttribute('data-full');
      lightboxImg.alt = trigger.getAttribute('data-title') || '';
      lightboxTitle.textContent = trigger.getAttribute('data-title') || '';
      lightboxScroll.scrollTop = 0;
      lightbox.showModal();
      requestAnimationFrame(function () {
        lightbox.classList.add('is-open');
      });
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        lightbox.close();
        if (lastTrigger) lastTrigger.focus();
      }
      lightbox.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 250);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        openLightbox(trigger);
      });
    });

    lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeLightbox();
    });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    var phoneLocal = document.getElementById('field-phone');
    var phoneFull = document.getElementById('field-phone-full');
    var phoneCountry = document.getElementById('field-phone-country');
    var countries = window.DD_COUNTRIES || [];
    var countryByCode = {};
    countries.forEach(function (c) { countryByCode[c.code] = c; });

    function guessCountryCode() {
      var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en-US'];
      for (var i = 0; i < langs.length; i++) {
        var region = null;
        try {
          var loc = new Intl.Locale(langs[i]);
          if (loc.maximize) loc = loc.maximize();
          region = loc.region;
        } catch (err) {
          var parts = langs[i].split('-');
          if (parts.length > 1 && parts[1].length === 2) region = parts[1].toUpperCase();
        }
        if (region && countryByCode[region]) return region;
      }
      return 'US';
    }

    if (phoneCountry && countries.length) {
      var sorted = countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      sorted.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = '+' + c.dial + ' ' + c.name;
        phoneCountry.appendChild(opt);
      });
      phoneCountry.value = guessCountryCode();
    }

    function syncPhone() {
      if (!phoneLocal || !phoneFull) return;
      var digits = phoneLocal.value.trim();
      var selected = phoneCountry && countryByCode[phoneCountry.value];
      var dial = selected ? selected.dial : '1';
      phoneFull.value = digits ? '+' + dial + ' ' + digits : '';
    }
    if (phoneLocal) phoneLocal.addEventListener('input', syncPhone);
    if (phoneCountry) phoneCountry.addEventListener('change', syncPhone);

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      syncPhone();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      var name = contactForm.elements['name'].value.trim();
      try {
        if (name) sessionStorage.setItem('dd_contact_name', name.split(' ')[0]);
      } catch (err) {}
      window.location.href = 'thank-you.html';
    });
  }
})();

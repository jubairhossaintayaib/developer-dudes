(() => {
  'use strict';

  const config = window.DD_PREVIEW_CONFIG || {};
  const emailAddress = config.contactEmail || 'thedeveloperdudesllc@gmail.com';
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // Native dialogs provide focus containment, Escape support and focus restoration.
  // The one-section page has no examples, so it has no project dialog.
  const projectDialog = document.getElementById('project-dialog');
  const contactDialog = document.getElementById('contact-dialog');
  document.querySelectorAll('[data-project]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const image = document.getElementById('project-image');
      document.getElementById('project-title').textContent = trigger.dataset.project;
      image.alt = `${trigger.dataset.project} full website preview`;
      image.src = trigger.dataset.image;
      projectDialog.showModal();
      projectDialog.querySelector('.project-dialog-scroll').scrollTop = 0;
    });
  });
  [projectDialog, contactDialog].filter(Boolean).forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });

  document.querySelectorAll('[data-whatsapp]').forEach(button => {
    button.addEventListener('click', () => {
      const number = String(config.whatsappNumber || '').replace(/\D/g, '');
      if (!/^[1-9]\d{7,14}$/.test(number)) {
        contactDialog.showModal();
        return;
      }
      const text = 'Hi Developer Dudes! I’d like to find out about a free homepage preview for my business.';
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    });
  });

  // Marketing explanation: transform-only scrolling, with explicit pause and
  // automatic suspension off screen. No motion for reduced-motion preferences.
  // Only the full page (free-preview-v2.html) has the laptop.
  const screen = document.getElementById('laptop-viewport');
  if (screen) {
    const screenshot = screen.querySelector('img');
    const motionToggle = document.getElementById('motion-toggle');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let userPaused = reducedMotion.matches;
    let inView = true;
    let hovering = false;
    let animation;
    function updatePlayback() {
      if (!animation) return;
      if (userPaused || !inView || hovering || document.hidden) animation.pause();
      else animation.play();
      motionToggle.setAttribute('aria-pressed', String(userPaused));
      motionToggle.replaceChildren(document.createTextNode(userPaused ? 'Play preview ▷' : 'Pause preview Ⅱ'));
    }
    function buildAnimation() {
      const distance = Math.max(0, screenshot.getBoundingClientRect().height - screen.clientHeight);
      const previousTime = animation?.currentTime || 0;
      animation?.cancel();
      animation = screenshot.animate([
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(0)', offset: 0.08 },
        { transform: `translateY(-${distance}px)`, offset: 0.92 },
        { transform: `translateY(-${distance}px)`, offset: 1 }
      ], { duration: 34000, iterations: Infinity, direction: 'alternate', easing: 'linear' });
      animation.currentTime = previousTime;
      updatePlayback();
    }
    if (screenshot.complete) buildAnimation();
    else screenshot.addEventListener('load', buildAnimation, { once: true });
    new ResizeObserver(buildAnimation).observe(screen);
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updatePlayback();
    }, { threshold: 0.05 }).observe(screen);
    motionToggle.addEventListener('click', () => { userPaused = !userPaused; updatePlayback(); });
    screen.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; updatePlayback(); } });
    screen.addEventListener('pointerleave', () => { hovering = false; updatePlayback(); });
    document.addEventListener('visibilitychange', updatePlayback);
    reducedMotion.addEventListener('change', () => {
      userPaused = reducedMotion.matches;
      if (userPaused && animation) animation.currentTime = 0;
      updatePlayback();
    });
  }

  const form = document.getElementById('preview-form');
  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const lastStep = steps.length - 1;
  const segments = Array.from(form.querySelectorAll('.form-progress > span'));
  const next = document.getElementById('form-next');
  const nextLabel = next.querySelector('span');
  const back = document.getElementById('form-back');
  const error = document.getElementById('form-error');
  let currentStep = 0;
  let advanceTimer;
  let submitting = false;
  let submitted = false;
  // Meta's own cookies from this visit. Saved with the lead so that later updates about it
  // can be matched to the ad that was clicked.
  function cookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function metaClickId() {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    return cookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
  }
  function readValues() {
    const value = name => form.elements[name].value.trim();
    return {
      trade: value('trade'), website: value('website'), findable: value('findable'),
      work_source: value('work_source'), extra_jobs: value('extra_jobs'),
      business: value('business'), name: value('name'), whatsapp: value('whatsapp'),
      fbc: metaClickId(), fbp: cookie('_fbp'),
      offer: 'Free website build; £39/month hosting, management and updates',
      source: 'free-preview'
    };
  }
  // The closing message reflects what the visitor said about their website and being found.
  function renderResult() {
    const { website, findable } = readValues();
    let title = 'You’re losing jobs you never hear about.';
    let text = 'Going by your answers, people searching for your trade online can’t count on finding you. They don’t ring round. They pick whoever shows up, and that job is gone before you knew it existed.';
    if (website === 'Happy with current website' && findable === 'Yes') {
      title = 'You’re ahead of most. Let’s see if we can beat it.';
      text = 'You’re already showing up, which puts you in front of most local trades. A homepage preview costs you nothing, so it’s worth seeing what we’d do differently.';
    } else if (website === 'Old or outdated website') {
      title = 'Your website is turning customers away.';
      text = 'An outdated website makes a good business look like a risky one. Customers judge it in seconds, then move on to the next name in the list.';
    } else if (findable === 'Yes') {
      title = 'Customers find you, then find no website.';
      text = 'People are looking you up, but there’s no proper website to show them your work. Without one, it’s easy for them to pick a competitor who has.';
    }
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-text').textContent = text;
  }
  // UK numbers are grouped as they're typed and capped at their full length.
  // A leading + keeps another country's number, up to the 15-digit E.164 limit.
  function groupUkNumber(digits) {
    const sizes = /^07/.test(digits) ? [5, 6]
      : /^02/.test(digits) ? [3, 4, 4]
      : /^01(?:1\d|\d1)/.test(digits) ? [4, 3, 4]
      : /^01/.test(digits) ? [5, 6]
      : [4, 3, 4];
    const groups = [];
    let start = 0;
    for (const size of sizes) {
      if (start >= digits.length) break;
      groups.push(digits.slice(start, start + size));
      start += size;
    }
    return groups.join(' ');
  }
  // shift is how many digits the tidy-up added or dropped before the caret.
  function formatWhatsapp(raw) {
    let digits = raw.replace(/\D/g, '');
    let international = raw.trim().startsWith('+');
    let shift = 0;
    if (!international && digits.startsWith('00')) { digits = digits.slice(2); international = true; shift -= 2; }
    if (!international && digits.startsWith('44')) international = true;
    if (international && !digits.startsWith('44')) return { value: `+${digits.slice(0, 15)}`, shift };
    if (international) {
      let national = digits.slice(2);
      if (national.startsWith('0')) { national = national.slice(1); shift -= 1; }
      national = national.slice(0, 10);
      return { value: national ? `+44 ${groupUkNumber(`0${national}`).slice(1)}` : '+44', shift };
    }
    if (/^[1235789]/.test(digits)) { digits = `0${digits}`; shift += 1; }
    return { value: groupUkNumber(digits.slice(0, 11)), shift };
  }
  function isValidWhatsapp(value) {
    const digits = value.replace(/\D/g, '');
    if (value.startsWith('+') && !digits.startsWith('44')) return digits.length >= 8 && digits.length <= 15;
    const national = value.startsWith('+') ? `0${digits.slice(2)}` : digits;
    return /^0(?:1\d{8,9}|[235789]\d{9})$/.test(national);
  }
  function showError(message, control) {
    error.textContent = message;
    error.hidden = false;
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-errormessage', 'form-error');
      control.focus();
    }
  }
  function clearError() {
    error.hidden = true;
    error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(control => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-errormessage');
    });
  }
  function validateDetails() {
    clearError();
    for (const input of steps[lastStep].querySelectorAll('input')) {
      input.value = input.value.trim();
      if (input.name === 'whatsapp') {
        input.value = formatWhatsapp(input.value).value;
        input.setCustomValidity(!input.value || isValidWhatsapp(input.value) ? '' : 'Enter a full UK number, e.g. 07700 900123. Outside the UK? Start with + and your country code.');
      }
      if (!input.checkValidity()) {
        showError(input.validity.valueMissing ? `Please enter your ${input.dataset.label}.` : input.validationMessage, input);
        return false;
      }
    }
    return true;
  }
  function showStep(index, focus = true) {
    clearTimeout(advanceTimer);
    currentStep = index;
    clearError();
    steps.forEach((step, position) => {
      step.hidden = position !== index;
      step.disabled = position !== index;
    });
    segments.forEach((segment, position) => segment.classList.toggle('is-done', position <= index));
    form.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(index + 1));
    document.getElementById('step-count').textContent = index < lastStep ? `Question ${index + 1} of ${lastStep}` : 'Your result';
    back.hidden = index === 0;
    next.hidden = index !== lastStep;
    if (index === lastStep) renderResult();
    if (!focus) return;
    // The quiz changes height between steps, so keep its top in view.
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: 'start' });
    // On the last step focus goes to the result, not a field, so a phone keyboard doesn't cover it.
    const target = index === lastStep ? document.getElementById('result-title')
      : steps[index].querySelector('input:checked') || steps[index].querySelector('input');
    target.focus({ preventScroll: true });
  }
  // Choosing an answer moves straight on; the short pause lets the choice show as selected.
  function continueFromChoice() {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      if (currentStep < lastStep && steps[currentStep].querySelector('input:checked')) showStep(currentStep + 1);
    }, 220);
  }
  async function submitApplication() {
    if (submitting || submitted) return;
    if (!config.submissionEndpoint) {
      showError('Online applications aren’t available just yet. Your request has not been sent. Please email us to request your free preview.');
      const link = document.createElement('a');
      link.href = `mailto:${emailAddress}?subject=${encodeURIComponent('Free homepage preview request')}`;
      link.textContent = ` ${emailAddress}`;
      error.append(link);
      return;
    }
    submitting = true;
    next.disabled = true;
    back.disabled = true;
    nextLabel.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    // Sent as text/plain so the browser makes a simple cross-origin request;
    // the Google Apps Script web app cannot answer a CORS preflight.
    // The lead is saved once the request reaches Google, but the reply takes several seconds.
    // keepalive lets the request finish after this page is left, so the visitor only waits
    // long enough for a dead connection to show up as an error.
    const saved = fetch(config.submissionEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(readValues()), keepalive: true, credentials: 'omit'
    }).then(response => response.json()).then(result => result.ok === true, () => false);
    const stillSending = new Promise(resolve => setTimeout(() => resolve(true), 1000));
    const sent = await Promise.race([saved, stillSending]);
    submitting = false;
    form.removeAttribute('aria-busy');
    if (!sent) {
      next.disabled = false;
      back.disabled = false;
      nextLabel.textContent = 'Get my free homepage preview';
      showError('We couldn’t send your request. Please check your connection and try again, or contact us by email. Your answers are still here.');
      const link = document.createElement('a');
      link.href = `mailto:${emailAddress}`;
      link.textContent = ` ${emailAddress}`;
      error.append(link);
      return;
    }
    // The button stays busy while the thank-you page loads, which greets by first name.
    submitted = true;
    try { sessionStorage.setItem('dd_preview_name', readValues().name.split(/\s+/)[0]); } catch (_) {}
    window.location.href = 'free-preview-thank-you.html';
  }
  // Coming back from the thank-you page can restore this page as it was left; start it afresh.
  window.addEventListener('pageshow', event => {
    if (!event.persisted || !submitted) return;
    submitted = false;
    next.disabled = false;
    back.disabled = false;
    nextLabel.textContent = 'Get my free homepage preview';
    form.reset();
    showStep(0, false);
  });
  function submitDetails() {
    if (submitting || submitted) return;
    // Every question must have its answer recorded before the lead is sent.
    const unanswered = steps.findIndex((step, index) => index < lastStep && !step.querySelector('input:checked'));
    if (unanswered !== -1) {
      showStep(unanswered);
      showError('Please choose an answer to carry on.');
      return;
    }
    if (validateDetails()) submitApplication();
  }
  next.addEventListener('click', submitDetails);
  back.addEventListener('click', () => { if (!submitting && currentStep > 0) showStep(currentStep - 1); });
  form.addEventListener('submit', event => { event.preventDefault(); if (currentStep === lastStep) submitDetails(); });
  form.addEventListener('click', event => {
    // A click that lands on the radio itself is the browser echoing a label press or an
    // arrow-key move, so only a press on the answer's own content moves on. The answer is
    // recorded here too, rather than relying on the browser to tick the radio.
    const option = event.target.closest('.quiz-options label');
    if (!option || event.target.tagName === 'INPUT') return;
    option.querySelector('input').checked = true;
    continueFromChoice();
  });
  form.addEventListener('keydown', event => {
    const input = event.target;
    if (event.key === 'Enter' && input.tagName === 'INPUT') {
      event.preventDefault();
      if (input.type === 'radio') {
        input.checked = true;
        continueFromChoice();
        return;
      }
      // Enter steps through the contact fields and sends from the last one left to fill.
      const fields = Array.from(steps[lastStep].querySelectorAll('input'));
      const nextEmpty = fields.slice(fields.indexOf(input) + 1).find(field => !field.value.trim());
      if (nextEmpty) nextEmpty.focus();
      else submitDetails();
    }
    if (currentStep < lastStep && /^[a-z]$/i.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const radio = steps[currentStep].querySelectorAll('input')[event.key.toLowerCase().charCodeAt(0) - 97];
      if (radio) {
        radio.checked = true;
        continueFromChoice();
      }
    }
  });
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.name === 'whatsapp') {
      const caret = input.selectionStart ?? input.value.length;
      const atEnd = caret >= input.value.length;
      const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
      const { value, shift } = formatWhatsapp(input.value);
      input.value = value;
      if (!atEnd) {
        // Keep the caret after the same digit it was after before regrouping.
        let position = 0;
        for (let seen = 0; position < value.length && seen < digitsBefore + shift; position += 1) {
          if (/\d/.test(value[position])) seen += 1;
        }
        input.setSelectionRange(position, position);
      }
      input.setCustomValidity('');
    }
    if (input.type !== 'radio') clearError();
  });
  showStep(0, false);
})();

(() => {
  'use strict';

  const config = window.DD_PREVIEW_CONFIG || {};
  const emailAddress = config.contactEmail || 'thedeveloperdudesllc@gmail.com';
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  // Native dialogs provide focus containment, Escape support and focus restoration.
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
  [projectDialog, contactDialog].forEach(dialog => {
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
  const screen = document.getElementById('laptop-viewport');
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

  const form = document.getElementById('preview-form');
  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const next = document.getElementById('form-next');
  const back = document.getElementById('form-back');
  const error = document.getElementById('form-error');
  const labels = ['YOUR BUSINESS', 'YOUR BUSINESS', 'A LITTLE INTRODUCTION', 'LET’S CONNECT', 'YOUR CONTACT DETAILS', 'CHECK YOUR DETAILS'];
  let currentStep = 0;
  let submitting = false;
  let submitted = false;
  function readValues() {
    const value = name => form.elements[name].value.trim();
    return {
      trade: value('trade'), business: value('business'), website: value('website'),
      name: value('name'), whatsapp: value('whatsapp'),
      email: value('email'),
      offer: 'Free website build; £39/month hosting, management and updates',
      source: 'free-preview'
    };
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
  function validateStep() {
    clearError();
    const active = steps[currentStep];
    const controls = Array.from(active.querySelectorAll('input'));
    for (const input of controls) {
      if (input.type !== 'radio') input.value = input.value.trim();
      if (input.name === 'whatsapp') {
        input.value = formatWhatsapp(input.value).value;
        input.setCustomValidity(isValidWhatsapp(input.value) ? '' : 'Enter a full UK number, e.g. 07700 900123. Outside the UK? Start with + and your country code.');
      }
      if (!input.checkValidity()) {
        const message = input.type === 'radio' ? 'Please choose the trade that best describes your business.'
          : input.type === 'email' ? 'Please enter a valid email address.'
          : input.validationMessage || 'Please fill in this answer to continue.';
        showError(message, input);
        return false;
      }
    }
    return true;
  }
  function renderReview() {
    const answers = readValues();
    const review = document.getElementById('application-review');
    review.replaceChildren();
    [['Trade', answers.trade], ['Business', answers.business], ['Website', answers.website || 'No existing website'], ['Name', answers.name], ['WhatsApp', answers.whatsapp], ['Email', answers.email]].forEach(([label, value]) => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      review.append(term, detail);
    });
  }
  function showStep(index, focus = true) {
    currentStep = index;
    clearError();
    steps.forEach((step, position) => {
      step.hidden = position !== index;
      step.disabled = position !== index;
    });
    document.getElementById('step-caption').textContent = labels[index];
    document.getElementById('step-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    document.getElementById('form-progress-fill').style.transform = `scaleX(${(index + 1) / steps.length})`;
    form.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(index + 1));
    back.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? 'Request my free preview →' : 'Next →';
    if (index === steps.length - 1) renderReview();
    if (focus) (steps[index].querySelector('input') || next).focus();
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
    next.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      // Sent as text/plain so the browser makes a simple cross-origin request;
      // the Google Apps Script web app cannot answer a CORS preflight.
      const response = await fetch(config.submissionEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(readValues()), signal: controller.signal, credentials: 'omit'
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(`Submission failed: ${response.status}`);
      submitted = true;
      try { sessionStorage.setItem('dd_preview_name', readValues().name.split(/\s+/)[0]); } catch (_) {}
      window.location.href = 'free-preview-thank-you.html';
    } catch (_) {
      showError('We couldn’t confirm your request was received. Please try again, or contact us by email. Your answers are still here.');
      const link = document.createElement('a');
      link.href = `mailto:${emailAddress}`;
      link.textContent = ` ${emailAddress}`;
      error.append(link);
    } finally {
      clearTimeout(timeout);
      submitting = false;
      form.removeAttribute('aria-busy');
      // On success the button stays busy while the thank-you page loads.
      if (!submitted) {
        next.disabled = false;
        back.disabled = false;
        next.textContent = 'Request my free preview →';
      }
    }
  }
  // Coming back from the thank-you page can restore this page as it was left; start it afresh.
  window.addEventListener('pageshow', event => {
    if (!event.persisted || !submitted) return;
    submitted = false;
    next.disabled = false;
    back.disabled = false;
    form.reset();
    showStep(0, false);
  });
  function advance() {
    if (submitting || submitted || !validateStep()) return;
    if (currentStep < steps.length - 1) showStep(currentStep + 1);
    else submitApplication();
  }
  next.addEventListener('click', advance);
  back.addEventListener('click', () => { if (!submitting && currentStep > 0) showStep(currentStep - 1); });
  form.addEventListener('submit', event => { event.preventDefault(); advance(); });
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      event.preventDefault();
      advance();
    }
    if (currentStep === 0 && /^[a-f]$/i.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const radio = steps[0].querySelectorAll('input')[event.key.toLowerCase().charCodeAt(0) - 97];
      radio.checked = true;
      radio.focus();
      clearError();
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
    clearError();
  });
  showStep(0, false);
})();

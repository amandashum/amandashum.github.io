import { portfolio } from './portfolio-content.mjs';
import { initHeroAnimation } from './terminal-animation.js?v=minute-hold';
import { initImpactRotation } from './impact-animation.js?v=flip-sequence';
import { initProjectTransition } from './project-transition.js?v=project-reveal';

document.documentElement.classList.add('js');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const mobile = matchMedia('(max-width: 850px)');
menu.hidden = false;

/** Keeps menu visibility and its announced state in sync. */
function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.toggleAttribute('data-open', open);
  menu.lastElementChild.textContent = open ? '−' : '+';
}

/** Moves keyboard focus to a destination heading without a second scroll. */
function focusSection(section) {
  const heading = section.querySelector('h1, h2');
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});
nav.addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (!anchor || !mobile.matches) return;
  event.preventDefault();
  setMenu(false);
  location.hash = anchor.hash;
  requestAnimationFrame(() => focusSection(document.querySelector(anchor.hash)));
});
mobile.addEventListener('change', () => setMenu(false));

/** Marks the most recently intersecting section using standard navigation links. */
function initSectionNavigation() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    const hash = `#${visible[0].target.id}`;
    nav.querySelectorAll('a').forEach(link => {
      if (link.hash === hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-90px 0px -55% 0px', threshold: 0 });
  document.querySelectorAll('main > section').forEach(section => observer.observe(section));
}

/** Adds a visible branch highlight, while keeping all project content visible. */
function initProjectHighlights() {
  const projects = document.querySelectorAll('.project-window');
  if (!('IntersectionObserver' in window)) {
    projects.forEach(project => project.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  projects.forEach(project => observer.observe(project));
}

/** Implements optional navigation commands without evaluating user input as code. */
function initCommands() {
  document.querySelector('#command-section').hidden = false;
  const form = document.querySelector('#command-form');
  const input = document.querySelector('#command-input');
  const output = document.querySelector('#command-output');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase();
    if (command === 'clear') {
      output.textContent = '';
      input.value = '';
    } else if (command === 'help') {
      output.textContent = 'Commands: help, about, projects, skills, contact, clear.';
    } else if (['about', 'projects', 'skills', 'contact'].includes(command)) {
      const section = document.getElementById(command);
      location.hash = command;
      requestAnimationFrame(() => focusSection(section));
      output.textContent = `Opened ${command}.`;
    } else {
      output.textContent = command ? `Unknown command: ${command}. Type help for available commands.` : 'Type a command, such as help.';
    }
  });
}

/** Shows contact feedback as plain text; preserves visitor input on errors. */
function setFormStatus(message, state = 'info') {
  const status = document.querySelector('#form-status');
  status.textContent = message;
  status.dataset.state = state;
}

/** Offers a real mailto draft without claiming that an email was sent. */
function prepareEmailDraft(data) {
  if (!portfolio.links.email) {
    setFormStatus('Email is not configured. Please use the LinkedIn link to get in touch.', 'error');
    return;
  }
  const subject = encodeURIComponent(`Portfolio message from ${data.name}`);
  const body = encodeURIComponent(`${data.message}\n\nFrom: ${data.name}\nReply to: ${data.email}`);
  const draft = document.createElement('a');
  draft.href = `mailto:${portfolio.links.email}?subject=${subject}&body=${body}`;
  draft.textContent = 'Open email draft';
  setFormStatus('Draft ready. Nothing has been sent. ');
  document.querySelector('#form-status').append(draft);
  draft.focus();
}

/** Validates input and submits only to an explicitly configured HTTPS endpoint. */
function initContact() {
  const form = document.querySelector('#contact-form');
  const button = document.querySelector('#contact-submit');
  button.textContent = portfolio.contact.endpoint ? 'Send message ↗' : 'Prepare email draft ↗';
  form.hidden = false;
  form.addEventListener('input', () => {
    for (const field of form.querySelectorAll('input, textarea')) field.setCustomValidity('');
    setFormStatus('');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = ['name', 'email', 'message'];
    const data = Object.fromEntries(fields.map(name => [name, form.elements.namedItem(name).value.trim()]));
    for (const name of fields) {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(!data[name] ? `Please enter your ${name}.` : '');
    }
    if (data.message && data.message.length < 10) form.elements.message.setCustomValidity('Please enter a message of at least 10 characters.');
    if (!form.reportValidity()) return;
    if (!portfolio.contact.endpoint) {
      prepareEmailDraft(data);
      return;
    }
    let endpoint;
    try {
      endpoint = new URL(portfolio.contact.endpoint);
      if (endpoint.protocol !== 'https:') throw new Error('Invalid endpoint');
    } catch {
      setFormStatus('The contact service is not configured correctly. Please use the email link.', 'error');
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';
    setFormStatus('Sending your message…');
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data), signal: controller.signal, credentials: 'omit',
      });
      if (!response.ok) throw new Error('Service rejected submission');
      const receipt = await response.json();
      if (receipt.success !== true) throw new Error('Service did not confirm receipt');
      setFormStatus('Your message was received by the contact service. Thank you.', 'success');
      form.reset();
    } catch {
      setFormStatus('Your message could not be confirmed. Your text is still here; try again or use the email link.', 'error');
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      form.removeAttribute('aria-busy');
      button.textContent = 'Send message ↗';
    }
  });
}

initSectionNavigation();
initProjectHighlights();
initCommands();
initContact();
initHeroAnimation();
initImpactRotation();
initProjectTransition();

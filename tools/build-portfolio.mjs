import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { portfolio as p } from '../portfolio-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Escapes editable content before placing it in HTML text or attributes. */
function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Only configured HTTPS public links become external anchors. */
function external(url, label, className = '') {
  if (!url) return '';
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error(`Public links must use HTTPS: ${label}`);
  return `<a class="${className}" href="${escape(parsed.href)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}

/** Builds a numbered section heading with a restrained directory label. */
function heading(index, label, title, description = '') {
  return `<header class="section-heading"><div><p class="eyebrow"><span>${index}</span> / ${label}</p><h2 id="${label}-title">${title}</h2></div>${description ? `<p class="section-description">${description}</p>` : ''}</header>`;
}

/** Renders consistent technology labels as a semantic list. */
function tags(items) {
  return `<ul class="tags">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
}

/** Gives the default headline deliberate line breaks without hardcoding its content. */
function heroHeadline(text) {
  const escaped = escape(text);
  if (text === 'Building AI that people can use.') {
    return escaped.replace('Building AI that people can use.', 'Building AI <br>that people <br>can use.');
  }
  return escaped;
}

/** Reserves the complete line so typing and loading indicators never move nearby content. */
function bootLine(text, kind = 'text', className = '') {
  const reserve = kind === 'status' ? text.replace(/ready$/, 'loading |') : text;
  return `<p class="boot-line ${className}" data-boot-kind="${kind}" data-boot-text="${escape(text)}"><span class="boot-reserve">${escape(reserve)}</span><span class="boot-text">${escape(text)}</span></p>`;
}

/** Renders one face of a rotating highlight while retaining the existing typography. */
function impactFace(item, side) {
  return `<div class="impact-face impact-${side}"><strong${item.value.length > 4 ? ' data-long-value' : ''}>${escape(item.value)}</strong><div><p>${escape(item.label)}</p><span>${escape(item.context)}</span></div></div>`;
}

/** Renders one project with evidence, optional real links, and confidentiality context. */
function project(item, index) {
  const links = Object.entries(item.links).map(([key, url]) => external(url, { caseStudy: 'Case study', github: 'GitHub', demo: 'Demo' }[key])).join('');
  return `<article class="project-window reveal" id="${escape(item.id)}" aria-labelledby="${item.id}-title">
    <div class="window-bar"><span class="window-icon" aria-hidden="true">▤</span><span>${escape(item.path)}</span><span class="window-dots" aria-hidden="true">− □ ×</span></div>
    <div class="project-body"><p class="eyebrow">0${index + 1} / ${escape(item.category)}</p><h3 id="${item.id}-title">${escape(item.name)}</h3><p class="project-summary">${escape(item.summary)}</p>
    <div class="project-metric"><strong>${escape(item.metric)}</strong><span>${escape(item.metricLabel)}</span></div>
    ${item.collapsible ? `<details class="project-details"><summary>Project details <span aria-hidden="true"></span><span class="visually-hidden">: ${escape(item.name)}</span></summary><div class="project-detail-content">` : ''}<dl class="project-story">${['problem', 'action', 'result'].map(key => `<div><dt>${key}</dt><dd>${escape(item[key])}</dd></div>`).join('')}</dl>
    ${tags(item.tags)}<p class="project-note">${escape(item.note)}</p>${links ? `<div class="project-links">${links}</div>` : ''}${item.collapsible ? '</div></details>' : ''}</div></article>`;
}

const resumeExists = p.links.resume && existsSync(new URL(`../${p.links.resume}`, import.meta.url));
const resumeLink = resumeExists ? `<a class="resume-link" href="${escape(p.links.resume)}" download>Resume <span aria-hidden="true">↓</span></a>` : '';
const emailLink = p.links.email ? `<a href="mailto:${escape(p.links.email)}">Email me <span aria-hidden="true">↗</span></a>` : '';
if (p.contact.endpoint && new URL(p.contact.endpoint).protocol !== 'https:') throw new Error('Contact endpoint must use HTTPS.');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0c0e12"><title>${escape(p.name)} — ${escape(p.role)}</title>
  <meta name="description" content="${escape(p.description)}">
  <meta property="og:type" content="website"><meta property="og:title" content="${escape(p.name)} — ${escape(p.role)}">
  <meta property="og:description" content="${escape(p.description)}"><meta property="og:locale" content="en_CA">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(p.name)} — ${escape(p.role)}">
  <meta name="twitter:description" content="${escape(p.description)}">
  ${p.links.site ? `<link rel="canonical" href="${escape(p.links.site)}"><meta property="og:url" content="${escape(p.links.site)}">` : ''}
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg?v=as-monogram">
  <link rel="stylesheet" href="styles.css?v=project-reveal"><script type="module" src="portfolio.js?v=project-reveal"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="topbar"><div class="nav-wrap">
  <a class="wordmark" href="#home" aria-label="Amanda Shum home"><span class="brand-mark" aria-hidden="true"><img src="assets/as-monogram.svg" width="24" height="18" alt=""></span><span>C:\\AMANDA\\</span></a>
  <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" hidden>Menu <span aria-hidden="true">+</span></button>
  <nav id="main-nav" aria-label="Main navigation"><a href="#about">About</a><a href="#projects">Projects</a><a href="#experience">Experience</a><a href="#skills">Skills</a><a href="#contact">Contact</a></nav>
  ${resumeLink}
</div></header>
<main id="main">
<section class="hero" id="home" aria-labelledby="hero-title"><div class="hero-inner page-width">
  <div class="hero-topline"><p>${escape(p.name)} <span class="muted">/ ${escape(p.role)}</span></p><p class="location">${escape(p.location)}</p></div>
  <div class="hero-grid"><div class="hero-copy">
    <h1 id="hero-title">${heroHeadline(p.headline)}</h1>
    <p class="hero-introduction">${escape(p.introduction)}</p>
    <div class="hero-actions"><a class="button button-primary" href="#projects">View Projects <span aria-hidden="true">↘</span></a><a class="button button-secondary" href="#contact">Get in Touch <span aria-hidden="true">↗</span></a></div>
  </div>
  <div class="boot-screen" role="group" aria-label="IBM-inspired startup display: computer vision, Azure AI and RAG, developer tools and automation">
    <div class="boot-display" aria-hidden="true">
      <svg class="boot-wordmark" viewBox="0 0 540 160" focusable="false">
        <defs><clipPath id="boot-stripes">${Array.from({ length: 8 }, (_, i) => `<rect x="0" y="${27 + i * 16}" width="540" height="11"/>`).join('')}</clipPath></defs>
        <g clip-path="url(#boot-stripes)"><text x="0" y="108" textLength="535" lengthAdjust="spacingAndGlyphs" transform="scale(1 1.3)" fill="currentColor" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="900">AMANDA</text></g>
      </svg>
      <div class="boot-system"><p>${escape(p.boot.system)}</p><p>AI Engineering Portfolio</p><p>Version ${escape(p.boot.version)}</p></div>
      <div class="boot-log">${p.boot.lines.map(line => bootLine(line, /ready$/.test(line) ? 'status' : 'text')).join('')}</div>
      ${bootLine('C:\\AMANDA\\>', 'prompt', 'boot-prompt')}
    </div>
  </div></div>
  <div class="impact-strip" aria-hidden="true">${p.impact.map((item, index) => `<div class="impact-item">${impactFace(item, 'front')}${impactFace(p.academicImpact[index], 'back')}</div>`).join('')}</div>
  <ul class="visually-hidden" aria-label="Selected project highlights">${[...p.impact, ...p.academicImpact].map(item => `<li>${escape(item.value)} ${escape(item.label)} — ${escape(item.context)}</li>`).join('')}</ul>
</div></section>
<section class="projects page-width section" id="projects" aria-labelledby="projects-title">
  ${heading('01', 'projects', 'Projects')}
  <div class="project-grid">${p.projects.map(project).join('')}</div>
</section>
<section class="about page-width section" id="about" aria-labelledby="about-title">
  ${heading('02', 'about', 'About')}
  <div class="about-grid"><div class="about-copy">${p.about.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div>
    <aside class="education-window" aria-labelledby="education-title"><div class="window-bar"><span class="window-icon" aria-hidden="true">▤</span><span>background.txt</span></div><div class="education-body"><h3 id="education-title">Education</h3>${p.education.map(item => `<div class="education-item"><p class="eyebrow">${escape(item.date)}</p><h4>${escape(item.title)}</h4><p>${escape(item.detail)}</p></div>`).join('')}</div></aside>
  </div>
</section>
<section class="experience page-width section" id="experience" aria-labelledby="experience-title">
  ${heading('03', 'experience', 'Experience')}
  <div class="timeline">${p.experience.map((item, index) => `<article class="timeline-item"><div class="timeline-date"><span class="timeline-node" aria-hidden="true"></span><p>${escape(item.date)}</p><span class="muted">0${index + 1} / experience.log</span></div><div class="timeline-copy"><h3>${escape(item.title)}</h3><p class="organization">${escape(item.organization)}</p><ul>${item.bullets.map(bullet => `<li>${escape(bullet)}</li>`).join('')}</ul></div></article>`).join('')}</div>
</section>
<section class="skills page-width section" id="skills" aria-labelledby="skills-title">
  ${heading('04', 'skills', 'Skills')}
  <div class="skills-grid">${p.skills.map((group, index) => `<div class="skill-group"><p class="eyebrow">0${index + 1} / TOOLKIT</p><h3>${escape(group.title)}</h3>${tags(group.items)}</div>`).join('')}</div>
  <div class="credential"><div class="credential-icon" aria-hidden="true"><span></span><span></span><span></span><span></span></div><div><p class="eyebrow">MICROSOFT CERTIFIED</p><h3>${escape(p.certification.name)}</h3><p>Earned ${escape(p.certification.earned)} · Expires ${escape(p.certification.expires)}</p>${external(p.certification.url, 'Verify credential')}</div><span class="credential-code">AI-103</span></div>
</section>
<section class="contact page-width section" id="contact" aria-labelledby="contact-title">
  ${heading('05', 'contact', 'Contact')}
  <div class="contact-grid"><div class="contact-copy"><p>Have a role, a project, or a question in mind? I’d like to hear about it.</p><div class="contact-links">${emailLink}${external(p.links.linkedin, 'LinkedIn')}${external(p.links.github, 'GitHub')}</div>
    <noscript><p>JavaScript is off. ${p.links.email ? 'Use the email link above to get in touch.' : 'Use LinkedIn above to get in touch.'}</p></noscript>
  </div><form id="contact-form" class="contact-form" hidden>
    <div class="form-row"><div><label for="contact-name">Name</label><input id="contact-name" name="name" autocomplete="name" required maxlength="120" placeholder="Your name"></div><div><label for="contact-email">Email</label><input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></div></div>
    <label for="contact-message">Message</label><textarea id="contact-message" name="message" required minlength="10" maxlength="5000" rows="5" placeholder="Tell me a little about what you have in mind."></textarea>
    <button class="button button-primary" type="submit" id="contact-submit">${p.contact.endpoint ? 'Send message' : 'Prepare email draft'} <span aria-hidden="true">↗</span></button><p id="form-status" role="status" aria-live="polite"></p>
  </form></div>
</section>
<div class="page-width command-section" hidden id="command-section"><details class="command-panel"><summary><span aria-hidden="true">&gt;_</span> Prefer a command line? <span class="muted">Optional terminal</span></summary><div class="command-body"><p>Try help, about, projects, skills, contact, or clear.</p><form id="command-form"><label for="command-input">C:\\AMANDA\\&gt;</label><input id="command-input" name="command" autocomplete="off" spellcheck="false" maxlength="80" aria-label="Portfolio command"><button type="submit">Run <span aria-hidden="true">↵</span></button></form><p id="command-output" role="status" aria-live="polite">Ready.</p></div></details></div>
</main>
<footer class="footer page-width"><span>© 2026 ${escape(p.name)}</span><span class="footer-signoff muted">C:\\AMANDA\\</span><a href="#home">Back to top <span aria-hidden="true">↑</span></a></footer>
</body></html>`;

writeFileSync(`${root}/index.html`, html.replace(/[ \t]+$/gm, ''));
const monogram = readFileSync(`${root}/assets/as-monogram.svg`, 'utf8').replace(/<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
writeFileSync(`${root}/assets/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" fill="#0c0e12" stroke="#7198ff"/><g transform="translate(8 15) scale(.57)">${monogram}</g></svg>\n`);
console.log(`Built index.html from portfolio-content.mjs. Resume ${resumeExists ? 'available' : 'hidden (file missing)'}.`);

/** Playwright CLI acceptance checks. All endpoint submissions below are intercepted mocks. */
async (page) => {
  const result = { widths: [], checks: [], errors: [] };
  const base = 'http://127.0.0.1:4173';
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });

  /** Fails the run on an unmet observable requirement. */
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  /** Fills the valid contact example shared by draft and mocked submission checks. */
  async function fillContact(target) {
    await target.locator('#contact-name').fill('Portfolio Visitor');
    await target.locator('#contact-email').fill('visitor@example.test');
    await target.locator('#contact-message').fill('I would like to discuss a computer vision project.');
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.waitForSelector('html.js');
  assert(await page.title() === 'Amanda Shum — AI Engineer', 'Incorrect title');
  assert(await page.locator('h1').count() === 1, 'Expected one primary heading');
  assert(await page.locator('.project-window').count() === 6, 'Expected six featured projects');
  assert(!await page.locator('.menu-toggle').isVisible(), 'Desktop menu toggle must be hidden');
  const brokenAnchors = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).filter(link => !document.querySelector(link.getAttribute('href'))).map(link => link.getAttribute('href')));
  assert(!brokenAnchors.length, `Broken local anchors: ${brokenAnchors}`);
  const missingAssets = await page.evaluate(async () => {
    const files = ['styles.css', 'portfolio.js', 'terminal-animation.js', 'impact-animation.js', 'project-transition.js', 'portfolio-content.mjs', 'assets/favicon.svg', 'assets/as-monogram.svg', 'Amanda_Shum_Resume.pdf'];
    const responses = await Promise.all(files.map(async file => ({ file, status: (await fetch(file, { method: 'HEAD' })).status })));
    return responses.filter(response => response.status !== 200);
  });
  assert(!missingAssets.length, `Missing active assets: ${JSON.stringify(missingAssets)}`);
  assert(await page.locator('.project-details').count() === 6, 'Expected six matching project disclosures');
  const collapsedCardHeights = await page.locator('.project-window').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height));
  for (const id of ['copilot-framework', 'chatbot-factory', 'workflow-automation', 'fruit-ripeness', 'pothole-detection', 'gridworld-coverage']) {
    const details = page.locator(`#${id} .project-details`);
    assert(!await details.evaluate(element => element.open), `${id} starts expanded`);
    await details.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert(await details.evaluate(element => element.open), `${id} does not expand by keyboard`);
    assert(await details.locator('.project-story').isVisible(), `${id} expanded details missing`);
    const cardStates = await page.locator('.project-window').evaluateAll(cards => cards.map(card => ({ id: card.id, open: card.querySelector('details').open, height: card.getBoundingClientRect().height })));
    assert(cardStates.filter(card => card.open).length === 1, 'More than one project opened');
    assert(cardStates.every((card, index) => card.id === id || Math.abs(card.height - collapsedCardHeights[index]) < 1), `${id} stretched a closed card`);
    await page.keyboard.press('Enter');
    assert(!await details.evaluate(element => element.open), `${id} does not collapse by keyboard`);
  }
  await page.locator('#copilot-framework summary').click();
  await page.locator('#fruit-ripeness summary').click();
  assert(await page.locator('.project-details[open]').count() === 2, 'Opening another project closed the previous one');
  await page.locator('#fruit-ripeness summary').click();
  assert(await page.locator('#copilot-framework .project-details').evaluate(element => element.open), 'Closing one project closed another');
  await page.locator('#copilot-framework summary').click();
  result.checks.push('metadata, six projects, all six details start collapsed and open/close by keyboard, local anchors, active asset requests');

  // Check the actual text palette, including filled CTA text, against WCAG AA.
  result.contrast = await page.evaluate(() => {
    /** Converts a hexadecimal CSS token into WCAG relative luminance. */
    function luminance(hex) {
      return hex.trim().replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    }
    const tokens = getComputedStyle(document.documentElement);
    const ratios = {};
    for (const background of ['--bg', '--surface', '--raised']) {
      for (const foreground of ['--text', '--muted', '--faint', '--blue', '--green']) {
        const a = luminance(tokens.getPropertyValue(background));
        const b = luminance(tokens.getPropertyValue(foreground));
        ratios[`${foreground} / ${background}`] = Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2));
      }
    }
    ratios['white / filled CTA'] = Number((1.05 / (luminance(tokens.getPropertyValue('--blue-solid')) + .05)).toFixed(2));
    return ratios;
  });
  assert(Object.values(result.contrast).every(ratio => ratio >= 4.5), 'A text token fails 4.5:1 contrast');
  result.checks.push('text palette and CTA contrast ≥ 4.5:1');

  await page.locator('.impact-strip').scrollIntoViewIfNeeded();
  await page.waitForSelector('.impact-strip[data-state="running"]');
  const stripHeight = (await page.locator('.impact-strip').boundingBox()).height;
  await page.waitForSelector('.impact-strip[data-set="academic"]');
  assert(await page.locator('.impact-back').count() === 3, 'Academic highlight faces missing');
  assert((await page.locator('.impact-back').allTextContents()).some(text => text.includes('96%')), 'Fruit highlight missing');
  assert((await page.locator('.impact-back').allTextContents()).some(text => text.includes('85%')), 'Gridworld highlight missing');
  await page.waitForSelector('.impact-strip[data-set="applied"]');
  assert(stripHeight === (await page.locator('.impact-strip').boundingBox()).height, 'Highlight flip changed strip height');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForSelector('.impact-strip[data-state="static"]');
  for (const face of await page.locator('.impact-face').all()) assert(await face.isVisible(), 'Static mode hides a highlight');
  assert(await page.locator('ul[aria-label="Selected project highlights"] li').count() === 6, 'Static accessible highlights missing');
  await page.setViewportSize({ width: 320, height: 844 });
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Static highlights overflow at 320px');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  result.checks.push('highlight flip to academic and back, fixed height, all six reduced-motion/accessibility highlights, static 320px layout');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    result.widths.push({ width, overflow });
    assert(!overflow, `Horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('.menu-toggle').focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'true', 'Keyboard menu open failed');
  assert(await page.locator('#main-nav').isVisible(), 'Expanded mobile navigation is hidden');
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Expanded menu overflows at 320px');
  await page.keyboard.press('Escape');
  assert(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false', 'Escape did not close menu');
  assert(await page.locator('.menu-toggle').evaluate(element => element === document.activeElement), 'Escape lost menu focus');
  await page.keyboard.press('Enter');
  await page.locator('#main-nav a[href="#contact"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'contact-title');
  assert(page.url().endsWith('#contact'), 'Keyboard navigation did not reach contact');
  assert(await page.locator('#contact-title').evaluate(element => element === document.activeElement), 'Destination heading did not receive focus');
  assert(!await page.locator('#main-nav').isVisible(), 'Mobile menu did not close on navigation');
  result.checks.push('320px menu, keyboard open, Escape, anchor navigation, destination focus');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.keyboard.press('Tab');
  assert(await page.locator('.skip-link').evaluate(element => element === document.activeElement), 'Skip link is not first keyboard stop');
  await page.keyboard.press('Enter');
  assert(page.url().endsWith('#main'), 'Skip link destination failed');
  await page.locator('.command-panel summary').click();
  await page.locator('#command-input').fill('help');
  await page.locator('#command-input').press('Enter');
  assert((await page.locator('#command-output').textContent()).includes('Commands:'), 'Help command failed');
  await page.locator('#command-input').fill('<script>unknown</script>');
  await page.locator('#command-input').press('Enter');
  assert((await page.locator('#command-output').textContent()).includes('Unknown command:'), 'Unknown command feedback missing');
  assert(await page.locator('#command-output script').count() === 0, 'Command input became HTML');
  await page.locator('#command-input').fill('clear');
  await page.locator('#command-input').press('Enter');
  assert(await page.locator('#command-output').textContent() === '', 'Clear command failed');
  await page.locator('#command-input').fill('projects');
  await page.locator('#command-input').press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'projects-title');
  assert(page.url().endsWith('#projects'), 'Project command navigation failed');
  assert(await page.locator('#projects-title').evaluate(element => element === document.activeElement), 'Command destination focus failed');
  result.checks.push('skip link, visible focus, help/unknown/clear/navigation commands');

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForSelector('.boot-screen[data-state="running"]');
  assert(await page.locator('#boot-replay').count() === 0, 'Replay button remains');
  assert(await page.locator('#hero-title').isVisible(), 'Boot hid the headline');
  assert(await page.locator('.hero-actions a').first().isVisible(), 'Boot hid the primary CTA');
  const beforeBoot = await page.locator('#home').boundingBox();
  await page.waitForFunction(() => document.querySelector('.boot-screen').dataset.phase === 'loading');
  assert((await page.locator('.boot-log .boot-text').allTextContents()).some(text => text.includes('loading')), 'Loading indicator missing');
  const loadingText = await page.locator('.boot-log .boot-text').allTextContents();
  await page.waitForTimeout(190);
  assert(JSON.stringify(await page.locator('.boot-log .boot-text').allTextContents()) !== JSON.stringify(loadingText), 'DOS spinner did not move');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForSelector('.boot-screen[data-state="paused"]', { state: 'attached' });
  const pausedText = await page.locator('.boot-line .boot-text').allTextContents();
  await page.waitForTimeout(200);
  assert(JSON.stringify(await page.locator('.boot-line .boot-text').allTextContents()) === JSON.stringify(pausedText), 'Boot continued offscreen');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.boot-screen').dataset.phase === 'hold');
  assert((await page.locator('.boot-log .boot-text').allTextContents()).includes('Portfolio loaded.'), 'Portfolio-loaded stage missing');
  assert((await page.locator('.boot-prompt .boot-text').textContent()).startsWith('C:'), 'Typed prompt missing');
  const completedCycle = Number(await page.locator('.boot-screen').getAttribute('data-cycle'));
  await page.waitForTimeout(3000);
  assert(await page.locator('.boot-screen').getAttribute('data-phase') === 'hold', 'Startup still uses the previous short hold');
  await page.waitForFunction(previous => Number(document.querySelector('.boot-screen').dataset.cycle) > previous, completedCycle, { timeout: 65000 });
  assert(beforeBoot.height === (await page.locator('#home').boundingBox()).height, 'Loop changed hero height');
  assert(await page.locator('#boot-motion-toggle').count() === 0, 'Pause animation control remains');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForSelector('.boot-screen[data-state="static"]');
  assert(await page.locator('.boot-line').last().isVisible(), 'Reduced motion hides boot prompt');
  assert(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) === 'auto', 'Reduced motion still smooth-scrolls');
  const bootContrast = await page.locator('.hero').evaluate(element => {
    /** Returns relative luminance for one computed RGB color. */
    function luminance(value) {
      return value.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => channel / 255)
        .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    }
    const bg = luminance(getComputedStyle(element).backgroundColor);
    return [...element.querySelectorAll('h1, .hero-introduction, .boot-system, .impact-item span')]
      .map(text => (luminance(getComputedStyle(text).color) + .05) / (bg + .05));
  });
  assert(bootContrast.every(ratio => ratio >= 4.5), 'Boot hero text fails contrast');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  result.checks.push('automatic DOS typing/spinner/ready/prompt loop, no replay or pause control, offscreen pause, no layout shift, reduced motion, blue-screen contrast');

  await page.locator('#contact-name').fill('   ');
  await page.locator('#contact-email').fill('visitor@example.test');
  await page.locator('#contact-message').fill('This is a valid length message.');
  await page.locator('#contact-submit').click();
  assert(!await page.locator('#contact-name').evaluate(element => element.validity.valid), 'Whitespace name accepted');
  await page.locator('#contact-name').fill('Portfolio Visitor');
  await page.locator('#contact-email').fill('invalid-email');
  await page.locator('#contact-submit').click();
  assert(!await page.locator('#contact-email').evaluate(element => element.validity.valid), 'Malformed email accepted');
  await fillContact(page);
  await page.locator('#contact-submit').click();
  const draft = page.locator('#form-status a');
  assert(await draft.count() === 1, 'Draft link missing');
  const href = await draft.getAttribute('href');
  assert(href.startsWith('mailto:amanda.ws.shum@gmail.com?'), 'Wrong email draft recipient');
  assert(decodeURIComponent(href).includes('Reply to: visitor@example.test'), 'Reply address missing from draft');
  assert((await page.locator('#form-status').textContent()).includes('Nothing has been sent'), 'Draft fallback claims delivery');
  assert(await page.locator('#contact-name').inputValue() === 'Portfolio Visitor', 'Draft flow erased visitor data');
  result.checks.push('required/whitespace/email validation, correct draft, no false send success');

  // Swap only browser responses, not project files, to exercise the configured service flow.
  const context = await page.context().browser().newContext();
  const servicePage = await context.newPage();
  let responseMode = 'reject';
  let captured;
  let submissions = 0;
  await servicePage.route('**/portfolio-content.mjs', async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace('contact: { endpoint: null }', "contact: { endpoint: 'https://contact.example.test/submit' }");
    await route.fulfill({ response, body: source });
  });
  await servicePage.route('https://contact.example.test/submit', async route => {
    submissions++;
    captured = route.request().postDataJSON();
    if (responseMode === 'network') return route.abort('failed');
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({ status: responseMode === 'reject' ? 500 : 200, contentType: 'application/json', body: responseMode === 'malformed' ? 'not json' : JSON.stringify({ success: responseMode === 'success' }) });
  });
  await servicePage.goto(base);
  await fillContact(servicePage);
  await servicePage.locator('#contact-submit').click();
  assert(await servicePage.locator('#contact-submit').isDisabled(), 'Loading button remains enabled');
  assert(await servicePage.locator('#contact-form').getAttribute('aria-busy') === 'true', 'Busy state missing');
  await servicePage.waitForSelector('#form-status[data-state="error"]');
  assert(await servicePage.locator('#contact-message').inputValue() !== '', 'Server failure erased message');
  for (const mode of ['falseReceipt', 'malformed', 'network']) {
    responseMode = mode;
    await servicePage.locator('#contact-submit').click();
    await servicePage.waitForFunction(() => !document.querySelector('#contact-submit').disabled);
    assert(await servicePage.locator('#form-status').getAttribute('data-state') === 'error', `${mode} reported false success`);
    assert(await servicePage.locator('#contact-message').inputValue() !== '', `${mode} erased message`);
  }
  responseMode = 'success';
  await servicePage.locator('#contact-submit').click();
  await servicePage.waitForSelector('#form-status[data-state="success"]');
  assert(captured.email === 'visitor@example.test', 'Wrong submitted email payload');
  assert(await servicePage.locator('#contact-message').inputValue() === '', 'Confirmed success did not reset form');
  assert(submissions === 5, 'Unexpected submission count');
  await context.close();
  result.checks.push('mocked endpoint loading, HTTP rejection, false receipt, malformed JSON, network failure, success');

  const noJsContext = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(base);
  assert(await noJsPage.locator('#main-nav').isVisible(), 'No-JS navigation hidden');
  assert(await noJsPage.locator('.project-window').count() === 6, 'No-JS projects missing');
  for (const id of ['copilot-framework', 'chatbot-factory', 'workflow-automation', 'fruit-ripeness', 'pothole-detection', 'gridworld-coverage']) {
    await noJsPage.locator(`#${id} summary`).click();
    assert(await noJsPage.locator(`#${id} .project-story`).isVisible(), `${id} no-JS disclosure does not open`);
    await noJsPage.locator(`#${id} summary`).click();
  }
  assert(await noJsPage.locator('a[href^="mailto:"]').isVisible(), 'No-JS email fallback missing');
  assert(!await noJsPage.locator('#contact-form').isVisible(), 'No-JS form misleadingly enabled');
  assert(!await noJsPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'No-JS page overflows at 320px');
  await noJsContext.close();
  result.checks.push('JavaScript-disabled content, navigation, email fallback, 320px layout');

  await page.goto(base);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/dos-desktop.png' });
  await page.screenshot({ path: 'output/playwright/dos-full.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/dos-mobile.png' });
  await page.screenshot({ path: 'output/playwright/dos-mobile-full.png', fullPage: true });
  assert(!result.errors.length, `Page errors: ${result.errors.join('; ')}`);
  return result;
}

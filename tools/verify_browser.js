/** Playwright CLI run-code entry point for the local portfolio acceptance checks. */
async (page) => {
  const result = { modes: [], widths: [], errors: [] };
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') result.errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(() => document.querySelector('#render-status').textContent.includes('interactive'));
  for (const mode of ['original', 'objects', 'semantics', 'depth', 'spatial', 'pixels']) {
    await page.locator(`[data-view="${mode}"]`).click();
    await page.waitForTimeout(400);
    if (await page.locator(`[data-view="${mode}"]`).getAttribute('aria-pressed') !== 'true') throw new Error(`${mode} did not activate`);
    await page.locator('#scene-viewport').screenshot({ path: `output/playwright/view-${mode}.png` });
    result.modes.push(mode);
  }
  await page.locator('[data-view="spatial"]').click();
  await page.locator('[data-filter="trees"]').click();
  if (!((await page.locator('#view-description').textContent()).includes('Trees'))) throw new Error('Tree filter did not update');
  await page.locator('[data-filter="road"]').click();
  await page.locator('[data-filter="vehicles"]').click();
  await page.locator('[data-filter="all"]').click();
  await page.locator('#point-toggle').click();
  await page.locator('#scene-viewport').screenshot({ path: 'output/playwright/point-cloud.png' });
  await page.locator('#point-toggle').click();
  await page.locator('#separation').focus();
  await page.keyboard.press('Home');
  if (await page.locator('#separation').inputValue() !== '0') throw new Error('Depth slider Home failed');
  await page.keyboard.press('End');
  if (await page.locator('#separation').inputValue() !== '100') throw new Error('Depth slider End failed');
  await page.locator('#vision-canvas').focus();
  await page.waitForTimeout(450);
  const before = await page.locator('#vision-canvas').screenshot();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(450);
  const after = await page.locator('#vision-canvas').screenshot();
  if (before.equals(after)) throw new Error('Keyboard orbit did not change rendered pixels');
  result.keyboardOrbit = 'rendered pixels changed';
  const bounds = await page.locator('#vision-canvas').boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height*.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.72,bounds.y+bounds.height*.54,{steps:8});
  await page.mouse.up();
  await page.locator('#reset-view').click();
  if (await page.locator('#separation').inputValue() !== '85') throw new Error('Reset failed');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    result.widths.push({ width, overflow });
    if (overflow) throw new Error(`Page overflow at ${width}px`);
  }
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({ path: 'output/playwright/final-desktop.png' });
  await page.screenshot({ path: 'output/playwright/final-full-page.png', fullPage:true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({ path: 'output/playwright/final-mobile.png' });
  await page.locator('#scene-viewport').screenshot({ path: 'output/playwright/mobile-scene.png' });
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.locator('#reset-view').click();
  if (!((await page.locator('#scene-help').textContent()).includes('Motion reduced'))) throw new Error('Reduced motion not reflected');
  result.reducedMotion = 'enabled';
  await page.emulateMedia({ reducedMotion:'no-preference' });
  result.brokenAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.querySelector(a.getAttribute('href'))).map(a => a.getAttribute('href')));
  if (result.brokenAnchors.length) throw new Error('Broken local navigation');
  const noJS = await page.context().browser().newContext({ javaScriptEnabled:false, viewport:{width:390,height:844} });
  const noJSPage = await noJS.newPage();
  await noJSPage.goto('http://127.0.0.1:4173');
  if (!(await noJSPage.locator('#scene-poster').isVisible())) throw new Error('No-JavaScript poster missing');
  if (!(await noJSPage.locator('#work').isVisible())) throw new Error('No-JavaScript content missing');
  result.noJavaScript = 'poster and content available';
  await noJS.close();
  const failedPage = await page.context().newPage();
  await failedPage.route('**/assets/perception/scene.glb*', route => route.abort());
  await failedPage.goto('http://127.0.0.1:4173');
  await failedPage.waitForFunction(() => document.querySelector('#render-status').textContent.includes('preview'));
  if (!(await failedPage.locator('#scene-poster').isVisible())) throw new Error('Failed-load poster missing');
  result.modelFailure = 'Blender poster restored';
  await failedPage.close();
  if (result.errors.length) throw new Error(JSON.stringify(result.errors));
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  return result;
}

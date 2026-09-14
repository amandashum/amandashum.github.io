/** Check text contrast, reduced-motion scrolling, and unavailable WebGL fallback. */
async (page) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('interactive'));
  const contrast = await page.evaluate(() => {
    /** Convert a CSS hex token to WCAG relative luminance. */
    function luminance(hex) {
      const rgb=hex.trim().replace('#','').match(/../g).map(value=>parseInt(value,16)/255);
      return rgb.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4)
        .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
    }
    const css=getComputedStyle(document.documentElement),result={};
    for(const background of ['--bg','--surface'])for(const foreground of ['--ink','--muted','--faint','--accent']){
      const a=luminance(css.getPropertyValue(background)),b=luminance(css.getPropertyValue(foreground));
      result[foreground+' on '+background]=Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2));
    }
    return result;
  });
  if(Object.values(contrast).some(value=>value<4.5))throw new Error('Text token contrast below 4.5:1');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#reset-view').click();
  await page.evaluate(()=>scrollTo({top:350,behavior:'instant'}));
  await page.waitForTimeout(150);
  if(await page.locator('#separation').inputValue()!=='85')throw new Error('Scroll changed depth in reduced-motion mode');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const unsupported=await page.context().newPage();
  await unsupported.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type.startsWith('webgl'))return null;
      return original.call(this,type,...args);
    };
  });
  await unsupported.goto('http://127.0.0.1:4173');
  await unsupported.waitForFunction(()=>document.querySelector('#render-status').textContent.includes('preview'));
  if(!(await unsupported.locator('#scene-poster').isVisible()))throw new Error('WebGL-unavailable fallback failed');
  await unsupported.close();
  await page.locator('[data-view="semantics"]').click();
  await page.locator('[data-filter="trees"]').click();
  await page.locator('#scene-viewport').screenshot({path:'output/playwright/trees-highlighted.png'});
  await page.locator('[data-filter="road"]').click();
  await page.locator('#scene-viewport').screenshot({path:'output/playwright/road-highlighted.png'});
  await page.locator('#reset-view').click();
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  return {contrast,reducedMotionScroll:'unchanged',webglUnavailable:'Blender poster available'};
}

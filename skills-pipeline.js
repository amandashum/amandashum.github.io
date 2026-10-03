'use strict';

/** Continuously circulate decorative skill logos down the tube. */
(() => {
  const pipeline = document.querySelector('.skills-pipeline');
  if (!pipeline) return;
  const logos = [...pipeline.querySelectorAll('img')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function render(timestamp) {
    frame = 0;
    if (reducedMotion.matches) {
      logos.forEach(logo => {
        ['top', 'bottom', 'transform', 'opacity'].forEach(property => {
          logo.style.removeProperty(property);
        });
      });
      return;
    }
    if (document.hidden) return;
    const size = pipeline.clientWidth < 60 ? 20 : 40;
    const outlet = Math.max(0, pipeline.clientHeight - 100 - size);
    logos.forEach((logo, index) => {
      const journey = (timestamp / 24000 + index / logos.length) % 1;
      const y = journey * outlet;
      logo.style.top = '0';
      logo.style.bottom = 'auto';
      logo.style.opacity = Math.min(1, journey / .04, (1 - journey) / .06) * .78;
      logo.style.transform =
        `translateY(${y}px) rotate(${Math.sin(journey * Math.PI * 2 + index) * 8}deg)`;
    });
    schedule();
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  reducedMotion.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      schedule();
    }
  });
  schedule();
})();

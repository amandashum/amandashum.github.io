/** Reveals the Projects heading and connector during ordinary scrolling. */
export function initProjectTransition() {
  const projects = document.querySelector('#projects');
  if (!projects) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let keyboardScroll = false;

  function update() {
    frame = undefined;
    if (reduced.matches || keyboardScroll) {
      projects.removeAttribute('data-scroll-reveal');
      return;
    }
    const top = projects.getBoundingClientRect().top;
    const progress = Math.min(1, Math.max(0, (innerHeight * .82 - top) / (innerHeight * .38)));
    const eased = 1 - (1 - progress) ** 3;
    projects.style.setProperty('--projects-reveal', eased.toFixed(3));
    projects.style.setProperty('--projects-opacity', (.85 + .15 * eased).toFixed(3));
    projects.style.setProperty('--projects-offset', `${(14 * (1 - eased)).toFixed(2)}px`);
    projects.setAttribute('data-scroll-reveal', '');
  }

  function queueUpdate() {
    if (frame === undefined) frame = requestAnimationFrame(update);
  }

  function usePointerScroll() {
    keyboardScroll = false;
    queueUpdate();
  }

  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate);
  window.addEventListener('wheel', usePointerScroll, { passive: true });
  window.addEventListener('touchstart', usePointerScroll, { passive: true });
  document.addEventListener('pointerdown', usePointerScroll);
  document.addEventListener('keydown', event => {
    if (['Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      keyboardScroll = true;
      queueUpdate();
    }
  });
  reduced.addEventListener('change', queueUpdate);
  update();
}

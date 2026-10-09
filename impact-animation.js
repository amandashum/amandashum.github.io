/** Alternates project highlights only while the strip is visible and motion is enabled. */
export function initImpactRotation() {
  const strip = document.querySelector('.impact-strip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canObserve = 'IntersectionObserver' in window;
  let inView = false;
  let timer;

  /** Starts a left-to-right sequence every seven seconds. */
  function flip() {
    timer = undefined;
    if (!inView || document.hidden || reduced.matches) return;
    const academic = strip.classList.toggle('is-flipped');
    strip.classList.add('is-flipping');
    strip.dataset.set = academic ? 'academic' : 'applied';
    timer = setTimeout(flip, 7000);
  }

  /** Applies the same motion preference as startup, with all six facts visible in static mode. */
  function updateRotation() {
    clearTimeout(timer);
    timer = undefined;
    strip.classList.remove('is-flipping');
    if (reduced.matches || !canObserve) {
      strip.classList.remove('is-rotating', 'is-flipped');
      strip.dataset.state = 'static';
      strip.dataset.set = 'all';
      return;
    }
    strip.classList.add('is-rotating');
    strip.dataset.set = strip.classList.contains('is-flipped') ? 'academic' : 'applied';
    const paused = !inView || document.hidden;
    strip.dataset.state = paused ? 'paused' : 'running';
    if (!paused) timer = setTimeout(flip, 7000);
  }

  strip.addEventListener('animationend', event => {
    if (event.animationName === 'impact-depth' && event.target.closest('.impact-item') === strip.lastElementChild) {
      strip.classList.remove('is-flipping');
    }
  });
  reduced.addEventListener('change', updateRotation);
  document.addEventListener('visibilitychange', updateRotation);
  if (canObserve) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateRotation();
    }, { threshold: .15 });
    observer.observe(strip);
  }
  updateRotation();
}

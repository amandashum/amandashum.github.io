/** Types and loops the startup display while it is visible and motion is enabled. */
export function initHeroAnimation() {
  const screen = document.querySelector('.boot-screen');
  const toggle = document.querySelector('#boot-motion-toggle');
  const lines = [...screen.querySelectorAll('.boot-line')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canObserve = 'IntersectionObserver' in window;
  const spinner = ['|', '/', '-', '\\'];
  let inView = false;
  let userPaused = false;
  let timer;
  let lineIndex = 0;
  let character = 0;
  let spinnerFrame = 0;
  let phase = 'reset';
  let cycle = 0;

  /** Writes plain text and adds a single small caret only to the active typed line. */
  function writeLine(line, text, caret = false) {
    const target = line.querySelector('.boot-text');
    target.textContent = text;
    if (caret) {
      const cursor = document.createElement('span');
      cursor.className = 'boot-cursor';
      cursor.textContent = '_';
      target.append(cursor);
    }
  }

  /** Displays the complete static version when animation is unavailable or reduced. */
  function showStatic() {
    clearTimeout(timer);
    timer = undefined;
    phase = 'static';
    lines.forEach(line => writeLine(line, line.dataset.bootText, line.dataset.bootKind === 'prompt'));
    screen.dataset.state = 'static';
    screen.dataset.phase = 'static';
  }

  /** Schedules one small text update; there is never a continuous frame loop. */
  function schedule(delay) {
    timer = setTimeout(step, delay);
  }

  /** Advances typing, loading, readiness, command prompt, and the next automatic cycle. */
  function step() {
    timer = undefined;
    if (!inView || document.hidden || userPaused || reduced.matches) return;
    let delay = 38;
    if (phase === 'reset') {
      cycle++;
      screen.dataset.cycle = String(cycle);
      lines.forEach(line => writeLine(line, ''));
      lineIndex = 0;
      character = 0;
      phase = 'typing';
      delay = 220;
    } else if (phase === 'typing') {
      const line = lines[lineIndex];
      const text = line.dataset.bootText;
      const typed = line.dataset.bootKind === 'status' ? text.replace(/ready$/, 'loading ') : text;
      character++;
      writeLine(line, typed.slice(0, character), true);
      if (character >= typed.length) {
        if (line.dataset.bootKind === 'status') {
          phase = 'loading';
          spinnerFrame = 0;
          delay = 180;
        } else if (line.dataset.bootKind === 'prompt') {
          phase = 'hold';
          delay = 2400;
        } else {
          writeLine(line, text);
          phase = 'next';
          delay = text === 'Portfolio loaded.' ? 450 : 220;
        }
      }
    } else if (phase === 'loading') {
      const line = lines[lineIndex];
      writeLine(line, line.dataset.bootText.replace(/ready$/, `loading ${spinner[spinnerFrame % spinner.length]}`));
      spinnerFrame++;
      delay = 180;
      if (spinnerFrame === 6) {
        writeLine(line, line.dataset.bootText);
        phase = 'next';
        delay = 250;
      }
    } else if (phase === 'next') {
      lineIndex++;
      character = 0;
      phase = 'typing';
      delay = 80;
    } else if (phase === 'hold') {
      phase = 'reset';
      delay = 350;
    }
    screen.dataset.phase = phase;
    schedule(delay);
  }

  /** Combines user preference, viewport visibility, and background-tab pause reasons. */
  function updateMotion() {
    toggle.hidden = reduced.matches || !canObserve;
    toggle.textContent = userPaused ? 'Resume animation' : 'Pause animation';
    toggle.setAttribute('aria-pressed', String(userPaused));
    if (reduced.matches || !canObserve) {
      showStatic();
      return;
    }
    if (phase === 'static') phase = 'reset';
    if (!inView || document.hidden || userPaused) {
      clearTimeout(timer);
      timer = undefined;
      screen.dataset.state = 'paused';
    } else {
      screen.dataset.state = 'running';
      if (timer === undefined) schedule(100);
    }
  }

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  if (canObserve) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateMotion();
    }, { threshold: .05 });
    observer.observe(screen);
  }
  updateMotion();
}

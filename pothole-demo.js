'use strict';

(async () => {
  const image = document.querySelector('#pothole-image');
  const overlay = document.querySelector('#pothole-boxes');
  const toggle = document.querySelector('#pothole-toggle');
  const slider = document.querySelector('#pothole-confidence');
  const output = document.querySelector('#pothole-confidence-value');
  const status = document.querySelector('#pothole-status');
  const results = document.querySelector('#pothole-results');
  const list = document.querySelector('#pothole-result-list');
  const buttons = [...document.querySelectorAll('[data-sample]')];
  const descriptions = [
    'A large water-filled pothole on a cracked road.',
    'A road surface with a pothole and broken asphalt.',
    'A road sample with multiple damaged regions.',
    'A road sample used to evaluate pothole detection.'
  ];
  let selected = 0;
  let visible = false;
  let requestId = 0;
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attributes) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  };
  try {
    const response = await fetch('assets/pothole/predictions.json');
    if (!response.ok) throw new Error('Unavailable predictions');
    const data = await response.json();
    function render() {
      const sample = data.images[selected];
      const predictions = sample.detections.filter(d => d.confidence >= Number(slider.value) / 100);
      overlay.replaceChildren();
      list.replaceChildren();
      overlay.setAttribute('viewBox', `0 0 ${sample.width} ${sample.height}`);
      overlay.toggleAttribute('hidden', !visible);
      output.value = `${slider.value}%`;
      toggle.textContent = visible ? 'Hide detections' : 'Show detections';
      toggle.setAttribute('aria-pressed', String(visible));
      results.hidden = !visible;
      predictions.forEach((detection, index) => {
        const [left, top, right, bottom] = detection.box;
        overlay.append(element('rect', {x:left, y:top, width:right-left, height:bottom-top, class:'detection-box'}));
        // Label sizing is proportional to the image so it stays legible on mobile.
        const size = sample.width * Math.max(.027, 14 / Math.max(1, image.clientWidth));
        const labelWidth = size * 9;
        const labelX = Math.max(0, Math.min(left, sample.width - labelWidth));
        const labelY = Math.max(0, top - size * 1.5);
        overlay.append(element('rect', {x:labelX, y:labelY, width:labelWidth, height:size*1.5, class:'detection-caption'}));
        const text = element('text', {x:labelX+size*.3, y:labelY+size*1.08, 'font-size':size, class:'detection-text'});
        text.textContent = `Pothole ${Math.round(detection.confidence*100)}%`;
        overlay.append(text);
        const item = document.createElement('li');
        item.textContent = `Pothole ${index+1}: ${Math.round(detection.confidence*100)}% confidence. Box from (${Math.round(left)}, ${Math.round(top)}) to (${Math.round(right)}, ${Math.round(bottom)}) image pixels.`;
        list.append(item);
      });
      const summary = predictions.length ? `${predictions.length} ${predictions.length === 1 ? 'pothole' : 'potholes'}` : 'No detections';
      status.textContent = visible ? summary : '';
      image.alt = descriptions[selected] + (visible ? ` ${summary} at the selected confidence threshold; details are available in View detections.` : '');
    }
    async function select(index) {
      const request = ++requestId;
      const sample = data.images[index];
      const candidate = new Image();
      candidate.src = sample.src;
      try { await candidate.decode(); } catch { status.textContent = 'Image unavailable. Choose another image.'; return; }
      if (request !== requestId) return;
      selected = index;
      image.src = sample.src;
      image.width = sample.width;
      image.height = sample.height;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.sample) === selected)));
      render();
    }
    buttons.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.sample))));
    toggle.addEventListener('click', () => { visible = !visible; render(); });
    slider.addEventListener('input', render);
    window.addEventListener('resize', render);
    document.querySelector('#pothole-reset').addEventListener('click', () => {
      visible = false;
      slider.value = '40';
      results.open = false;
      select(0);
    });
    await select(0);
    document.querySelector('#pothole-controls').hidden = false;
  } catch {
    status.textContent = 'Interactive controls are unavailable. The project image remains visible.';
  }
})();

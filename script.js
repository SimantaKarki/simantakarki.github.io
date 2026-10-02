const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Nav: scrolled state + mobile toggle =====
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

// ===== Active section highlighting =====
const navAnchors = document.querySelectorAll('a[data-nav]');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  });
}, { rootMargin: '-40% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));

// ===== Scroll reveal =====
document.querySelectorAll('.section, .hero-inner').forEach(el => el.classList.add('reveal'));
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== Project card spotlight =====
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// ===== Background: drifting probability waves + math glyphs =====
(() => {
  const c = document.getElementById('field');
  const ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const glyphs = ['ψ', 'ħ', 'Σ', '∫', '∇', 'π', '∞', 'λ', 'θ', 'Δ', '⊗', '√', 'e', 'φ', '∂'];
  let w, h, parts = [];

  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(38, Math.floor(w * h / 38000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vy: -(0.08 + Math.random() * 0.18),
      g: glyphs[Math.floor(Math.random() * glyphs.length)],
      s: 14 + Math.random() * 26,
      a: 0.04 + Math.random() * 0.1,
      ph: Math.random() * 6.28
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);

    // standing-wave lines
    const scroll = window.scrollY * 0.15;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * (0.3 + k * 0.22) - scroll * (k + 1) * 0.3 % h
          + Math.sin(x * 0.006 * (k + 1) + t * 0.0004 * (k + 1)) * 26
          * Math.sin(x * 0.0021 + t * 0.0002);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = k % 2 ? 'rgba(177,140,255,.07)' : 'rgba(94,231,255,.07)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    for (const p of parts) {
      p.y += p.vy;
      if (p.y < -40) { p.y = h + 40; p.x = Math.random() * w; }
      ctx.font = `italic ${p.s}px "Cormorant Garamond", serif`;
      ctx.fillStyle = `rgba(160,175,255,${p.a * (0.7 + 0.3 * Math.sin(t * 0.001 + p.ph))})`;
      ctx.fillText(p.g, p.x, p.y);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  frame(0);
})();

// ===== Bloch sphere (qubit state vector) =====
(() => {
  const c = document.getElementById('bloch');
  const caption = document.getElementById('blochCaption');
  const ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let size = 400;

  // view rotation + qubit state (theta from +z, phi around z)
  let yaw = 0.6, pitch = 0.45;
  let theta = 1.0, phi = 0;
  let targetTheta = null; // set when a measurement collapses the state
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  let flash = 0, holdUntil = 0;

  function resize() {
    size = c.clientWidth;
    c.width = size * dpr; c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Bloch coords (x,y,z) -> screen; z is up
  function project(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    const y2 = y1 * cp - z * sp;      // depth
    const z2 = y1 * sp + z * cp;      // screen up
    const R = size * 0.34;
    return [size / 2 + x1 * R, size / 2 - z2 * R, y2];
  }

  function ring(fn, n, color, width) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const [px, py] = project(...fn(a));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }

  function label(text, x, y, z, color) {
    const [px, py] = project(x, y, z);
    ctx.fillStyle = color;
    ctx.font = 'italic 17px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, px, py + 5);
  }

  function setCaption() {
    const a = Math.cos(theta / 2).toFixed(2);
    const b = Math.sin(theta / 2).toFixed(2);
    caption.innerHTML = `|ψ⟩ = ${a}|0⟩ + e<sup>i·${(((phi % 6.283) + 6.283) % 6.283).toFixed(1)}</sup>·${b}|1⟩`;
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    const R = size * 0.34;

    // sphere glow
    const g = ctx.createRadialGradient(size / 2, size / 2, R * 0.2, size / 2, size / 2, R * 1.35);
    g.addColorStop(0, 'rgba(94,231,255,.10)'); g.addColorStop(1, 'rgba(94,231,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(size / 2, size / 2, R * 1.35, 0, 7); ctx.fill();

    ctx.beginPath(); ctx.arc(size / 2, size / 2, R, 0, 7);
    ctx.strokeStyle = 'rgba(140,160,255,.35)'; ctx.lineWidth = 1.2; ctx.stroke();

    ring(a => [Math.cos(a), Math.sin(a), 0], 90, 'rgba(94,231,255,.4)', 1);      // equator
    ring(a => [Math.cos(a), 0, Math.sin(a)], 90, 'rgba(140,160,255,.2)', 1);     // xz meridian
    ring(a => [0, Math.cos(a), Math.sin(a)], 90, 'rgba(140,160,255,.2)', 1);     // yz meridian

    // axes
    [[1.18, 0, 0], [0, 1.18, 0], [0, 0, 1.18]].forEach(v => {
      const [ax, ay] = project(-v[0], -v[1], -v[2]);
      const [bx, by] = project(...v);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = 'rgba(152,160,200,.3)'; ctx.lineWidth = 1; ctx.stroke();
    });
    label('|0⟩', 0, 0, 1.32, '#e8ebff');
    label('|1⟩', 0, 0, -1.32, '#e8ebff');
    label('|+⟩', 1.3, 0, 0, '#98a0c8');
    label('|i⟩', 0, 1.3, 0, '#98a0c8');

    // state vector
    const sx = Math.sin(theta) * Math.cos(phi);
    const sy = Math.sin(theta) * Math.sin(phi);
    const sz = Math.cos(theta);
    const [ox, oy] = project(0, 0, 0);
    const [tx, ty] = project(sx, sy, sz);

    // shadow of the vector on the equator plane
    const [hx, hy] = project(sx, sy, 0);
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.moveTo(ox, oy); ctx.lineTo(hx, hy);
    ctx.strokeStyle = 'rgba(177,140,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);

    const grad = ctx.createLinearGradient(ox, oy, tx, ty);
    grad.addColorStop(0, '#5ee7ff'); grad.addColorStop(1, '#b18cff');
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = grad; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();

    ctx.shadowColor = '#b18cff'; ctx.shadowBlur = 16 + flash * 30;
    ctx.beginPath(); ctx.arc(tx, ty, 5 + flash * 5, 0, 7);
    ctx.fillStyle = flash > 0.05 ? '#ffd37a' : '#b18cff'; ctx.fill();
    ctx.shadowBlur = 0;
  }

  function tick() {
    if (!dragging) yaw += 0.0035;
    if (targetTheta === null) {
      // free precession + slow wander of theta (a rotating qubit)
      phi += 0.022;
      theta = 1.2 + Math.sin(performance.now() * 0.00035) * 0.9;
    } else {
      // collapsed: relax to the measured pole, hold briefly, then resume
      theta += (targetTheta - theta) * 0.12;
      if (!holdUntil && Math.abs(targetTheta - theta) < 0.02) holdUntil = performance.now() + 900;
      if (holdUntil && performance.now() > holdUntil) { targetTheta = null; holdUntil = 0; }
    }
    flash *= 0.93;
    setCaption();
    draw();
    if (!reduceMotion) requestAnimationFrame(tick);
  }

  // Interaction: drag to rotate the view, click (no drag) to measure
  c.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx * 0.01;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.01));
    lastX = e.clientX; lastY = e.clientY;
    if (reduceMotion) draw();
  });
  c.addEventListener('pointerup', () => {
    if (dragging && moved < 5 && targetTheta === null) {
      // Born rule: P(|0⟩) = cos²(θ/2)
      const p0 = Math.cos(theta / 2) ** 2;
      targetTheta = Math.random() < p0 ? 0 : Math.PI;
      flash = 1;
    }
    dragging = false;
  });

  resize();
  window.addEventListener('resize', () => { resize(); draw(); });
  document.fonts && document.fonts.ready.then(draw);
  tick();
})();

/* THE CIRCLE — Starry Night, Smooth Drifting Meteors & Celestial Ring Portal */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n).toFixed(2).replace(/\.00$/, '');
  const app = $('#app');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const mk = (text) => String(text).split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');

  async function api(url, opts) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }
  const post = (url, body) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  let toastTimer;
  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const mon = (d) => new Date(d).toLocaleString(undefined, { month: 'short' }).toUpperCase();
  const day = (d) => String(new Date(d).getDate()).padStart(2, '0');

  $('#year').textContent = new Date().getFullYear();

  const glow = $('#glow');
  let mx = innerWidth / 2, my = innerHeight / 2, nmx = 0, nmy = 0;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    nmx = (mx / innerWidth) * 2 - 1; nmy = (my / innerHeight) * 2 - 1;
    glow.style.left = mx + 'px'; glow.style.top = my + 'px';
  });

  // ---------- STARRY NIGHT & SMOOTH DRIFTING METEORS ENGINE ----------
  let warpBoost = 0;

  (() => {
    const c = $('#bgCanvas');
    if (!c) return;
    const g = c.getContext('2d');
    let W = 0, H = 0;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    addEventListener('resize', fit);

    const STAR_COUNT = 320;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      size: 0.5 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.6,
      tint: Math.random() > 0.78 ? '#d8c8ff' : Math.random() > 0.88 ? '#5ce1ff' : '#ffffff'
    }));

    const meteors = [];
    let nextMeteor = performance.now() + 1200;

    function spawnMeteor(now, burst = false) {
      const startX = Math.random() * W * 1.3;
      const startY = -60;
      const angle = (Math.PI * 0.62) + (Math.random() - 0.5) * 0.15;
      const speed = (burst ? 7 : 4.5) + Math.random() * 2.5;
      meteors.push({
        x: startX, y: startY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        len: (burst ? 180 : 120) + Math.random() * 80,
        life: 1, decay: 0.006 + Math.random() * 0.004,
        width: 1.0 + Math.random() * 1.2,
        cyan: Math.random() > 0.4
      });
      nextMeteor = now + 1800 + Math.random() * 3500;
    }

    window.__meteorShower = () => {
      const now = performance.now();
      for (let i = 0; i < 3; i++) setTimeout(() => spawnMeteor(performance.now(), true), i * 350);
      nextMeteor = now + 2500;
    };

    let lastScroll = window.scrollY || 0;

    function drawSpace(now) {
      requestAnimationFrame(drawSpace);
      const t = now * 0.00018;
      const scrollYNow = window.scrollY || 0;
      const scrollVel = clamp(Math.abs(scrollYNow - lastScroll) * 0.012, 0, 1.2);
      lastScroll = scrollYNow;

      warpBoost *= 0.92;
      const activeWarp = clamp(warpBoost + scrollVel * 0.15, 0, 1.8);

      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#020106';
      g.fillRect(0, 0, W, H);

      g.globalCompositeOperation = 'lighter';
      const nebulae = [
        { x: W * (0.3 + 0.04 * Math.sin(t)), y: H * (0.32 + 0.03 * Math.cos(t)), r: Math.max(W, H) * 0.52, col: 'rgba(92, 225, 255, 0.07)' },
        { x: W * (0.7 + 0.04 * Math.cos(t * 0.8)), y: H * (0.68 + 0.04 * Math.sin(t)), r: Math.max(W, H) * 0.48, col: 'rgba(155, 107, 255, 0.09)' }
      ];
      for (const n of nebulae) {
        const gr = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        gr.addColorStop(0, n.col);
        gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      }

      const cx = W * 0.5 - nmx * 20;
      const cy = H * 0.5 - nmy * 16;
      const zSpeed = 0.0004 + activeWarp * 0.012;

      for (const s of stars) {
        s.z -= zSpeed * s.speed;
        if (s.z <= 0.02) {
          s.z = 1;
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
        }

        const scale = 1 / s.z;
        const px = cx + s.x * W * 0.45 * scale;
        const py = cy + (s.y * H * 0.45 * scale) - ((scrollYNow * 0.06) / s.z) % H;
        const wrappedY = ((py % H) + H) % H;

        if (px < -50 || px > W + 50) continue;

        const depthAlpha = clamp((1 - s.z) * 1.3);
        const twinkle = 0.65 + 0.35 * Math.sin(now * 0.0025 * s.speed + s.twinkle);
        const alpha = depthAlpha * twinkle;

        if (activeWarp > 0.08) {
          const prevScale = 1 / Math.min(1, s.z + zSpeed * s.speed * 2.5);
          const ox = cx + s.x * W * 0.45 * prevScale;
          const oy = ((cy + (s.y * H * 0.45 * prevScale) - ((scrollYNow * 0.06) / Math.min(1, s.z + 0.04)) % H) % H + H) % H;

          g.strokeStyle = s.tint;
          g.globalAlpha = clamp(alpha * 0.7);
          g.lineWidth = s.size * clamp(scale * 0.35, 0.5, 1.8);
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(px, wrappedY);
          g.stroke();
        } else {
          g.fillStyle = s.tint;
          g.globalAlpha = clamp(alpha);
          const r = s.size * clamp(scale * 0.35, 0.5, 1.8);
          g.beginPath();
          g.arc(px, wrappedY, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;

      if (now >= nextMeteor && !reduceMotion) spawnMeteor(now);

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy; m.life -= m.decay;

        if (m.life <= 0 || m.x < -300 || m.y > H + 300) {
          meteors.splice(i, 1);
          continue;
        }

        const mag = Math.hypot(m.vx, m.vy) || 1;
        const tailX = m.x - (m.vx / mag) * m.len * m.life;
        const tailY = m.y - (m.vy / mag) * m.len * m.life;

        const grad = g.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${m.life * 0.9})`);
        grad.addColorStop(0.35, m.cyan ? `rgba(92, 225, 255, ${m.life * 0.7})` : `rgba(182, 138, 255, ${m.life * 0.7})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        g.strokeStyle = grad;
        g.lineWidth = m.width * m.life;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(m.x, m.y);
        g.lineTo(tailX, tailY);
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(drawSpace);
  })();

  let cur = 0, target = 0, hooks = [], resizers = [];
  const smoothOn = !coarse && !reduceMotion;
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

  addEventListener('scroll', () => { if (Math.abs(scrollY - cur) > 2) { cur = target = scrollY; } }, { passive: true });
  addEventListener('wheel', (e) => {
    if (!smoothOn || e.ctrlKey || document.body.classList.contains('is-loading')) return;
    if (!document.getElementById('lightbox').hidden) return;
    if (e.target.closest && e.target.closest('textarea, select')) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    target = clamp(target + dy, 0, maxScroll());
  }, { passive: false });
  addEventListener('resize', () => resizers.forEach((fn) => fn()));

  const progress = $('#progress');
  function tick() {
    if (smoothOn) {
      const d = target - cur;
      cur = Math.abs(d) > 0.05 ? cur + d * 0.085 : target;
      if (Math.abs(scrollY - cur) > 0.1) scrollTo(0, cur);
    } else {
      cur = scrollY;
    }
    progress.style.width = (cur / Math.max(1, maxScroll())) * 100 + '%';
    for (const h of hooks) h(cur);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  const observeReveals = () => $$('.reveal, .rt', app).forEach((el, i) => {
    if (el.classList.contains('reveal')) el.style.transitionDelay = (i % 3) * 80 + 'ms';
    io.observe(el);
  });

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      const el = en.target, tgt = parseInt(el.dataset.count, 10), suf = el.dataset.suffix || '', t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1800);
        el.textContent = Math.floor(tgt * (1 - Math.pow(1 - p, 4))).toLocaleString() + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });

  // ---------- CELESTIAL ASTROLABE / QUANTUM RING PORTAL ----------
  function createCelestialPortal(canvas, opts = {}) {
    const g = canvas.getContext('2d');
    const o = { scale: 1, alpha: 1, spin: 1, base: opts.base || 0.28, running: true, visible: true };
    let W = 0, H = 0;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    addEventListener('resize', fit);

    const particles = Array.from({ length: 48 }, (_, i) => ({
      ang: (i / 48) * Math.PI * 2,
      rad: 1.1 + (i % 4) * 0.18,
      speed: (0.3 + (i % 3) * 0.15) * (i % 2 === 0 ? 1 : -1),
      size: i % 6 === 0 ? 2.4 : 1.1
    }));

    const t0 = performance.now();
    let angle = 0;

    const frame = (now) => {
      if (!o.running || !canvas.isConnected) { removeEventListener('resize', fit); return; }
      requestAnimationFrame(frame);
      if (o.alpha <= 0.02) { g.clearRect(0, 0, W, H); return; }
      if (!o.visible) return;

      const t = (now - t0) / 1000;
      const e = opts.enter ? 1 - Math.pow(1 - clamp(t / 1.8), 3) : 1;
      const A = o.alpha * e;
      const R = Math.min(W, H) * o.base * o.scale * (0.75 + 0.25 * e);
      const cx = W / 2 + nmx * 16;
      const cy = H / 2 + nmy * 16;

      angle += 0.005 * o.spin;

      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, W, H);

      g.globalCompositeOperation = 'lighter';
      const aura = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2);
      aura.addColorStop(0, `rgba(92, 225, 255, ${0.32 * A})`);
      aura.addColorStop(0.4, `rgba(155, 107, 255, ${0.18 * A})`);
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = aura;
      g.fillRect(0, 0, W, H);

      const rings = [
        { r: R * 1.5, rot: angle, col: `rgba(92, 225, 255, ${0.45 * A})`, w: 1.5, dash: [8, 14] },
        { r: R * 1.2, rot: -angle * 1.3, col: `rgba(216, 200, 255, ${0.35 * A})`, w: 1.2 },
        { r: R * 0.85, rot: angle * 2, col: `rgba(255, 255, 255, ${0.65 * A})`, w: 1.8 }
      ];

      for (const rg of rings) {
        g.save();
        g.translate(cx, cy);
        g.rotate(rg.rot);
        if (rg.dash) g.setLineDash(rg.dash);
        g.strokeStyle = rg.col;
        g.lineWidth = rg.w;
        g.beginPath();
        g.arc(0, 0, rg.r, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }

      g.globalCompositeOperation = 'source-over';
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
      core.addColorStop(0, `rgba(2, 1, 6, ${0.98 * A})`);
      core.addColorStop(0.8, `rgba(12, 6, 28, ${0.95 * A})`);
      core.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = core;
      g.beginPath();
      g.arc(cx, cy, R * 0.75, 0, Math.PI * 2);
      g.fill();

      g.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const a = p.ang + angle * p.speed * 2;
        const px = cx + Math.cos(a) * R * p.rad;
        const py = cy + Math.sin(a) * R * p.rad * 0.65;
        g.fillStyle = `rgba(255, 255, 255, ${0.75 * A})`;
        g.beginPath();
        g.arc(px, py, p.size, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    };
    requestAnimationFrame(frame);
    return o;
  }

  function setupCosmicBurst() {
    const c = $('#smokeCanvas');
    if (!c) return;
    const g = c.getContext('2d');
    let W = 0, H = 0, running = true;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = c.clientWidth; H = c.clientHeight;
      c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    resizers.push(fit);

    let burst = 0;
    hooks.push(() => {
      const r = c.getBoundingClientRect();
      const centerDist = Math.abs((r.top + r.height * 0.5) - innerHeight * 0.5);
      const raw = clamp(1 - centerDist / (innerHeight * 0.7));
      burst += (raw - burst) * 0.1;
    });

    const renderBurst = (now) => {
      if (!running || !c.isConnected) return;
      requestAnimationFrame(renderBurst);
      g.clearRect(0, 0, W, H);
      if (burst < 0.01) return;

      const cx = W * 0.5; const cy = H * 0.5;
      const spread = Math.min(W, H) * (0.2 + burst * 0.5);

      g.globalCompositeOperation = 'lighter';
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, spread);
      core.addColorStop(0, `rgba(92, 225, 255, ${0.28 * burst})`);
      core.addColorStop(0.5, `rgba(155, 107, 255, ${0.15 * burst})`);
      core.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = core;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    };
    requestAnimationFrame(renderBurst);
    return () => { running = false; };
  }

  function makeArt(seed, w = 640, h = 800) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const pal = ['#ffffff', '#5ce1ff', '#9b6bff', '#2a4aa8'];
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#020106'); bg.addColorStop(1, '#0e0622');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w, col = pal[Math.floor(rnd() * pal.length)];
      const grad = g.createLinearGradient(x, h, x + (rnd() - 0.5) * w, 0);
      grad.addColorStop(0, col + '66'); grad.addColorStop(1, 'transparent');
      g.fillStyle = grad; g.beginPath(); g.moveTo(x - 10, h); g.lineTo(x + 10, h);
      g.lineTo(x + (rnd() - 0.5) * w * 1.2, 0); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    return c.toDataURL('image/jpeg', 0.85);
  }

  const intro = $('#intro'), introVideo = $('#introVideo'), introCanvas = $('#introCanvas');
  let introDone = false, introObj = null;

  async function finishIntro() {
    if (introDone) return;
    introDone = true;
    warpBoost = 1.6;
    if (window.__meteorShower) window.__meteorShower();
    intro.classList.add('out');
    document.body.classList.remove('is-loading');
    await route(location.pathname, { first: true });
    setTimeout(() => {
      if (introObj) introObj.running = false;
      intro.remove();
      try { introVideo.pause(); } catch (e) {}
    }, 950);
  }

  async function startIntro() {
    let videoSrc = null;
    try { videoSrc = (await api('/api/intro')).video; } catch (e) {}
    let useVideo = false;
    if (videoSrc) {
      introVideo.src = videoSrc; introVideo.hidden = false;
      try { await introVideo.play(); useVideo = true; } catch (e) { introVideo.hidden = true; }
    }
    if (useVideo) {
      introCanvas.style.display = 'none';
      introVideo.addEventListener('ended', finishIntro);
      introVideo.addEventListener('error', finishIntro);
      setTimeout(finishIntro, 15000);
    } else {
      introObj = createCelestialPortal(introCanvas, { base: 0.24, enter: true });
      setTimeout(finishIntro, reduceMotion ? 200 : 2100);
    }
    $('#introSkip').addEventListener('click', finishIntro);
    addEventListener('keydown', (e) => {
      if (!introDone && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) finishIntro();
    });
  }

  let cdTimer;
  function startCountdown(dateStr) {
    clearInterval(cdTimer);
    const el = $('#countdown'); if (!el) return;
    const target_ = new Date(dateStr).getTime();
    const tickCd = () => {
      let d = Math.max(0, target_ - Date.now());
      const days = Math.floor(d / 864e5); d %= 864e5;
      const h = Math.floor(d / 36e5); d %= 36e5;
      const m = Math.floor(d / 6e4); const s = Math.floor((d % 6e4) / 1000);
      el.innerHTML = [['Days', days], ['Hours', h], ['Mins', m], ['Secs', s]]
        .map(([l, v]) => `<div class="cd"><b>${String(v).padStart(2, '0')}</b><small>${l}</small></div>`).join('');
    };
    tickCd(); cdTimer = setInterval(() => { if (!$('#countdown')) return clearInterval(cdTimer); tickCd(); }, 1000);
  }

  const eventRow = (e) => `
    <a href="/tickets" data-link class="row reveal">
      <div class="d"><small>${mon(e.date)}</small>${day(e.date)}</div>
      <div><span class="badge">${esc(e.tag)}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></div>
      <div class="meta">${esc(e.venue)}, ${esc(e.city)}<br>${fmtDate(e.date)} · ${fmtTime(e.date)}</div>
      <div class="meta">${e.lineup.map(esc).join(' · ')}</div>
      <span class="arrow">↗</span>
    </a>`;

  const hCard = (e) => `
    <a href="/tickets" data-link class="hcard">
      <div class="d"><small>${mon(e.date)} · ${new Date(e.date).getFullYear()}</small>${day(e.date)}</div>
      <div class="foot"><div><h3>${esc(e.title)}</h3><p>${esc(e.venue)} · ${fmtTime(e.date)}</p><p>${e.lineup.map(esc).join(' · ')}</p></div><span class="link">Tickets ↗</span></div>
    </a>`;

  const newsletterBlock = () => `
    <section class="section"><div class="wrap"><div class="cta">
      <div class="eyebrow reveal">Stay close</div>
      <h2 class="h2 rt">${mk('Never miss a night')}</h2>
      <p class="reveal">Early-bird tickets, secret locations and surprise drops, straight to your inbox.</p>
      <form class="news reveal" id="newsForm"><input type="email" name="email" placeholder="Your email" required aria-label="Email" /><button type="submit">Join ↗</button></form>
    </div></div></section>`;

  function bindNewsletter() {
    const f = $('#newsForm'); if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await post('/api/subscribe', { email: f.email.value }); f.reset(); toast("You're on the list"); }
      catch (err) { toast(err.message, true); }
    });
  }

  function setupScrub() {
    const items = $$('.scrub', app).map((el) => ({ el, words: $$('span', el) }));
    if (!items.length) return;
    hooks.push(() => {
      for (const { el, words } of items) {
        const r = el.getBoundingClientRect();
        const p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.55 + r.height * 0.4));
        const n = words.length;
        words.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp(p * n * 1.05 - i)).toFixed(3); });
      }
    });
  }

  let heroObj = null, stopSmoke = null;

  function setupHero() {
    const canvas = $('#heroCanvas'); if (!canvas) return;
    heroObj = createCelestialPortal(canvas, { base: 0.28, enter: true });
    const L = $('#hTitleL'), R = $('#hTitleR'), ui = $('.hero-ui'), hint = $('.scroll-hint-wrap');
    hooks.push((y) => {
      const p = clamp(y / (innerHeight * 0.9));
      const mv = p * (innerWidth < 860 ? 28 : 38);
      L.style.transform = `translate3d(${-mv}vw,0,0)`;
      R.style.transform = `translate3d(${mv}vw,0,0)`;
      heroObj.scale = 1 + p * 0.8;
      heroObj.alpha = clamp(1 - p * 1.4);
      heroObj.spin = 1 + p * 6;
      heroObj.visible = p < 0.72;
      ui.style.opacity = String(1 - p * 1.6);
      hint.style.opacity = String(1 - p * 3);
    });
  }

  function setupHScroll() {
    const hs = $('#hs'); if (!hs) return;
    const track = $('.hs-track', hs);
    let total = 0, native = false;
    const layout = () => {
      native = innerWidth <= 860;
      if (native) { hs.style.height = 'auto'; track.style.transform = ''; return; }
      total = Math.max(0, track.offsetWidth - innerWidth);
      hs.style.height = innerHeight + total + 'px';
    };
    layout();
    resizers.push(layout);
    hooks.push(() => {
      if (native) return;
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, hs.offsetHeight - innerHeight));
      track.style.transform = `translate3d(${-p * total}px,0,0)`;
    });
  }

  const pages = {};

  pages.home = async () => {
    let events = [];
    try { events = await api('/api/events'); } catch (e) {}
    const upcoming = events.filter((e) => new Date(e.date) > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const next = upcoming[0];
    const words = ['Tickets on sale', 'No rules', 'Bass heavy', 'Limited spots', 'Dress to impress', 'All night long'];
    const mqHtml = [...words, ...words].map((w) => `<span>${w}</span><span class="f">✦</span>`).join('');
    const statement = 'We build nights people talk about for months. Monster sound, immersive light and a crowd that never stops moving.'.split(' ');
    return {
      html: `<div class="page">
        <section class="hero">
          <h1 class="hero-title rt"><span class="l" id="hTitleL">${mk('The')}</span><span class="r" id="hTitleR">${mk('Circle')}</span></h1>
          <canvas id="heroCanvas"></canvas>
          <div class="hero-ui">
            <div class="hero-top"><div class="side right">Built for<br>the night</div></div>
            <div class="hero-bot">
              <div><div class="side">We transcend<br>the dancefloor</div><a class="link" href="/tickets" data-link>Get tickets ↗</a></div>
              <div class="side right">${next ? 'Next party<br>' + fmtDate(next.date) : 'New dates<br>dropping soon'}</div>
            </div>
          </div>
          <div class="scroll-hint-wrap">
            <span class="scroll-hint-text">Scroll Down</span>
            <div class="scroll-hint-bar"></div>
          </div>
        </section>

        <section class="section manifesto-sec">
          <canvas id="smokeCanvas" aria-hidden="true"></canvas>
          <div class="wrap">
            <div class="eyebrow reveal">About</div>
            <p class="scrub" style="margin-top:34px">${statement.map((w) => `<span>${esc(w)}</span>`).join(' ')}</p>
          </div>
        </section>

        <section class="section" style="padding-top:0"><div class="wrap">
          <div class="eyebrow reveal">${next ? 'Countdown · ' + esc(next.title) : 'Stay tuned'}</div>
          <div id="countdown" class="countdown reveal"></div>
          ${next ? `<p class="reveal" style="color:var(--muted);margin-top:22px">${esc(next.venue)} · ${fmtDate(next.date)} · ${fmtTime(next.date)}</p>` : ''}
        </div></section>

        <section class="hs" id="hs"><div class="hs-sticky">
          <div class="hs-head"><div><div class="eyebrow">Upcoming</div><h2 class="h2 rt" style="margin-top:14px">${mk('Next up')}</h2></div><a class="link" href="/events" data-link>All events ↗</a></div>
          <div class="hs-track">${upcoming.map(hCard).join('') || '<p class="empty">New events coming soon.</p>'}<div class="hs-end"><a class="link" href="/events" data-link>All events ↗</a></div></div>
        </div></section>

        <section class="section"><div class="wrap"><div class="stats">
          <div class="stat reveal"><b data-count="120" data-suffix="+">0</b><span>Parties thrown</span></div>
          <div class="stat reveal"><b data-count="25000" data-suffix="+">0</b><span>Party people</span></div>
          <div class="stat reveal"><b data-count="40" data-suffix="+">0</b><span>Resident DJs</span></div>
          <div class="stat reveal"><b data-count="100" data-suffix="%">0</b><span>Good vibes</span></div>
        </div></div></section>

        <div class="mq" aria-hidden="true"><div class="track">${mqHtml}${mqHtml}</div></div>
        ${newsletterBlock()}
      </div>`,
      after() {
        setupHero();
        stopSmoke = setupCosmicBurst();
        setupScrub();
        setupHScroll();
        if (next) startCountdown(next.date);
        $$('[data-count]', app).forEach((el) => countIO.observe(el));
        bindNewsletter();
      },
    };
  };

  pages.events = async () => {
    let events = [];
    try { events = await api('/api/events'); } catch (e) {}
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    return {
      html: `<div class="page"><div class="wrap">
        <div class="page-head"><div class="eyebrow">Calendar</div><h1 class="rt">${mk('Events')}</h1><p class="reveal">Every party, every lineup. Lock in your date and grab tickets before they sell out.</p></div>
        <div class="rows">${events.map(eventRow).join('') || '<p class="empty">No events yet. Check back soon.</p>'}</div>
      </div>${newsletterBlock()}</div>`,
      after: bindNewsletter,
    };
  };

  pages.tickets = async () => {
    let tickets = [];
    try { tickets = await api('/api/tickets'); } catch (e) {}
    const availableTickets = tickets.filter((t) => t.remaining > 0);
    const defaultTicket = availableTickets[0] || tickets[0] || { id: '', name: '', price: 0 };

    return {
      html: `<div class="page"><div class="wrap">
        <div class="page-head"><div class="eyebrow">Don't miss out</div><h1 class="rt">${mk('Tickets')}</h1><p class="reveal">Pick your tier, fill in your details and you're on the list. Entry is 18+ with valid ID.</p></div>
        <div class="tiers">${tickets.map((t) => `
          <article class="tier reveal ${t.featured ? 'featured' : ''}">
            ${t.featured ? '<span class="flag">Best value</span>' : ''}
            <h3>${esc(t.name)}</h3>
            <div class="price"><sup>$</sup>${esc(t.price)}</div>
            <ul>${t.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
            <div class="left">${t.remaining > 0 ? t.remaining + ' left' : 'Sold out'}</div>
            <button class="btn ${t.featured ? 'solid' : ''}" data-pick="${esc(t.id)}" ${t.remaining < 1 ? 'disabled' : ''}>${t.remaining < 1 ? 'Sold out' : 'Select'}</button>
          </article>`).join('') || '<p class="empty">Tickets are not on sale yet.</p>'}</div>
        <div class="checkout" id="checkout" hidden>
          <form class="panel form" id="orderForm">
            <h2>Your details</h2>
            <div class="row2">
              <div class="field"><label for="oName">Full name</label><input id="oName" name="name" required maxlength="80" autocomplete="name" /></div>
              <div class="field"><label for="oEmail">Email</label><input id="oEmail" name="email" type="email" required autocomplete="email" /></div>
            </div>
            <div class="row2">
              <div class="field">
                <label>Ticket</label>
                <div class="custom-select-wrap" id="customSelect">
                  <button type="button" class="custom-select-trigger" id="selectTrigger">${esc(defaultTicket.name)} — ${money(defaultTicket.price)}</button>
                  <div class="custom-options" id="selectOptions">
                    ${availableTickets.map((t) => `<div class="custom-option ${t.id === defaultTicket.id ? 'selected' : ''}" data-value="${esc(t.id)}">${esc(t.name)} — ${money(t.price)}</div>`).join('')}
                  </div>
                  <input type="hidden" name="ticketId" id="ticketIdInput" value="${esc(defaultTicket.id)}" />
                </div>
              </div>
              <div class="field"><label for="oQty">Quantity</label><input id="oQty" name="quantity" type="number" min="1" max="10" value="1" required /></div>
            </div>
            <button class="btn solid" type="submit" id="orderBtn">Confirm order</button>
            <small style="color:var(--muted)">Demo checkout: orders are saved on the server.</small>
          </form>
          <aside class="panel summary"><h2>Summary</h2><div id="sum"></div></aside>
        </div>
      </div></div>`,
      after() {
        const box = $('#checkout'), form = $('#orderForm'), sum = $('#sum');
        const byId = Object.fromEntries(tickets.map((t) => [t.id, t]));
        
        // Custom Dropdown logic
        const customSelect = $('#customSelect');
        const selectTrigger = $('#selectTrigger');
        const selectOptions = $('#selectOptions');
        const ticketIdInput = $('#ticketIdInput');

        selectTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          customSelect.classList.toggle('open');
        });

        $$('.custom-option', selectOptions).forEach((opt) => {
          opt.addEventListener('click', () => {
            $$('.custom-option', selectOptions).forEach((o) => o.classList.remove('selected'));
            opt.classList.add('selected');
            ticketIdInput.value = opt.dataset.value;
            selectTrigger.textContent = opt.textContent;
            customSelect.classList.remove('open');
            update();
          });
        });

        addEventListener('click', (e) => {
          if (!customSelect.contains(e.target)) customSelect.classList.remove('open');
        });

        const update = () => {
          const t = byId[ticketIdInput.value]; const q = clamp(parseInt(form.quantity.value, 10) || 1, 1, 10);
          if (!t) return;
          sum.innerHTML = `<div class="line"><span>${esc(t.name)}</span><span>${money(t.price)}</span></div>
            <div class="line"><span>Quantity</span><span>× ${q}</span></div>
            <div class="line total"><span>Total</span><b>${money(t.price * q)}</b></div>`;
        };

        $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
          box.hidden = false; 
          const tid = b.dataset.pick;
          ticketIdInput.value = tid;
          const matchingOpt = $(`.custom-option[data-value="${tid}"]`, selectOptions);
          if (matchingOpt) {
            $$('.custom-option', selectOptions).forEach((o) => o.classList.remove('selected'));
            matchingOpt.classList.add('selected');
            selectTrigger.textContent = matchingOpt.textContent;
          }
          update();
          box.scrollIntoView({ behavior: 'smooth', block: 'center' }); form.name.focus({ preventScroll: true });
        }));

        form.addEventListener('input', update);
        update();

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = $('#orderBtn'); btn.disabled = true; btn.textContent = 'Processing…';
          try {
            const o = await post('/api/orders', { name: form.name.value, email: form.email.value, ticketId: ticketIdInput.value, quantity: form.quantity.value });
            box.innerHTML = `<div class="panel success" style="grid-column:1/-1">
              <div class="big">You're in</div>
              <p style="color:var(--muted);margin-top:14px">${esc(o.quantity)} × ${esc(o.ticketName)} for ${esc(o.name)} · total ${money(o.total)}</p>
              <div class="code">${esc(o.code)}</div>
              <p style="color:var(--muted)">Save your confirmation code and show it at the door.</p>
              <p style="margin-top:26px"><a href="/" data-link class="btn">Back home</a></p></div>`;
            toast('Order confirmed');
          } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Confirm order'; }
        });
      },
    };
  };

  pages.gallery = async () => {
    let items = [];
    try { items = await api('/api/gallery'); } catch (e) {}
    const demo = !items.length;
    if (demo) items = Array.from({ length: 12 }, (_, i) => ({ src: makeArt(i + 3, 640, i % 3 === 0 ? 900 : i % 3 === 1 ? 640 : 760), type: 'image' }));
    window.__gallery = items;
    return {
      html: `<div class="page"><div class="wrap">
        <div class="page-head"><div class="eyebrow">Memories</div><h1 class="rt">${mk('Gallery')}</h1><p class="reveal">Moments from the dancefloor. Tap any frame to open it full screen.</p></div>
        <div class="masonry">${items.map((it, i) => `<figure class="shot reveal" data-i="${i}"><img src="${it.src}" alt="Party photo ${i + 1}" loading="lazy" /><figcaption class="cap">№ ${String(i + 1).padStart(2, '0')}</figcaption></figure>`).join('')}</div>
      </div></div>`,
      after() {
        $$('.shot').forEach((s) => s.addEventListener('click', () => openLightbox(+s.dataset.i)));
      },
    };
  };

  pages.information = async () => {
    const info = [
      ['Doors & times', 'Doors open at 9 PM. Last entry at 1 AM. Music runs until late — check each event for exact times.'],
      ['Age & ID', '18+ only. Bring a valid photo ID — no ID, no entry, no refunds.'],
      ['Dress code', 'Dark, sharp, expressive. Keep your footwear comfortable, you will be dancing.'],
      ['Bag policy', 'Small bags only. Large backpacks, outside drinks and anything sharp stay home.'],
      ['Accessibility', 'Step-free entry and accessible facilities available. Contact support to arrange help in advance.'],
      ['Getting home', 'Plan your ride in advance. Never drive after drinking — a taxi rank is right outside.'],
    ];
    return {
      html: `<div class="page"><div class="wrap">
        <div class="page-head"><div class="eyebrow">Good to know</div><h1 class="rt">${mk('Information')}</h1><p class="reveal">Everything you need before you arrive: doors, dress code, rules and the answers to the questions we get most.</p></div>
        <div class="ilist">${info.map(([h, p], i) => `<div class="it reveal"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
        <h2 class="h2 rt" style="margin-bottom:34px">${mk('FAQ')}</h2>
        <div class="faq reveal">
          <details><summary>Can I get a refund?</summary><p>Tickets are non-refundable unless an event is cancelled.</p></details>
          <details><summary>Can I transfer my ticket to a friend?</summary><p>Yes — contact support with your confirmation code and your friend's name before the event.</p></details>
          <details><summary>Is there a cloakroom?</summary><p>Yes, a staffed cloakroom is available for a small fee.</p></details>
          <details><summary>Are re-entries allowed?</summary><p>No re-entry once you've left, so make sure you've got everything with you.</p></details>
        </div>
        <p style="margin:70px 0 20px"><a href="/support" data-link class="btn">Still need help? Contact support</a></p>
      </div></div>`,
      after() {},
    };
  };

  pages.support = async () => ({
    html: `<div class="page"><div class="wrap">
      <div class="page-head"><div class="eyebrow">We're here</div><h1 class="rt">${mk('Support')}</h1><p class="reveal">Lost your code? Need accessibility help? Want to book us? Send a message and we'll reply fast.</p></div>
      <div class="support-grid">
        <div class="contact-list">
          <div class="item reveal"><small>Email</small><b>support@thecircle.com</b></div>
          <div class="item reveal"><small>Instagram</small><b>@thecircle</b></div>
          <div class="item reveal"><small>Response time</small><b>Within 24 hours</b></div>
          <div class="item reveal"><small>Quick answers</small><a href="/information" data-link class="link">Check the FAQ ↗</a></div>
        </div>
        <form class="panel form reveal" id="supForm">
          <div class="row2">
            <div class="field"><label for="sName">Name</label><input id="sName" name="name" required maxlength="80" autocomplete="name" /></div>
            <div class="field"><label for="sEmail">Email</label><input id="sEmail" name="email" type="email" required autocomplete="email" /></div>
          </div>
          <div class="field"><label for="sTopic">Topic</label><select id="sTopic" name="topic"><option>Tickets & orders</option><option>Lost confirmation code</option><option>Accessibility</option><option>Other</option></select></div>
          <div class="field"><label for="sMsg">Message</label><textarea id="sMsg" name="message" required minlength="5" maxlength="2000" placeholder="How can we help?"></textarea></div>
          <button class="btn solid" type="submit" id="supBtn">Send message</button>
        </form>
      </div>
    </div></div>`,
    after() {
      const f = $('#supForm'); const btn = $('#supBtn');
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); btn.disabled = true; btn.textContent = 'Sending…';
        try {
          const r = await post('/api/support', { name: f.name.value, email: f.email.value, topic: f.topic.value, message: f.message.value });
          f.innerHTML = `<div class="success"><div class="big">Message sent</div><p style="color:var(--muted);margin-top:14px">Thanks! We'll get back to you soon.</p><div class="code">${esc(r.ref)}</div></div>`;
          toast('Message sent');
        } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Send message'; }
      });
    },
  });

  pages.notfound = async () => ({
    html: `<div class="page"><div class="wrap" style="padding:200px 0 100px">
      <div class="eyebrow">Lost</div>
      <h1 class="h2" style="font-size:clamp(6rem,24vw,20rem);margin:10px 0 20px">404</h1>
      <p style="color:var(--muted);margin-bottom:30px">This page left the party early.</p>
      <a href="/" data-link class="btn">Back to the dancefloor</a></div></div>`,
    after() {},
  });

  const lb = $('#lightbox'), stage = $('#lbStage');
  let lbIndex = 0;
  function showLb() {
    const it = window.__gallery[lbIndex];
    stage.innerHTML = `<img src="${it.src}" alt="" />`;
  }
  function openLightbox(i) { lbIndex = i; lb.hidden = false; showLb(); }
  const closeLb = () => { lb.hidden = true; stage.innerHTML = ''; };
  const stepLb = (d) => { const n = window.__gallery.length; lbIndex = (lbIndex + d + n) % n; showLb(); };
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => stepLb(-1));
  $('#lbNext').addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) closeLb(); });

  const routeVeil = $('#routeVeil');
  const LABELS = { home: 'Home', events: 'Events', tickets: 'Tickets', gallery: 'Gallery', information: 'Information', support: 'Support', notfound: 'Lost' };
  let current = null, busy = false;

  const routeName = (path) => {
    const p = path.replace(/\/+$/, '') || '/';
    if (p === '/') return 'home';
    const n = p.slice(1);
    return pages[n] && n !== 'notfound' ? n : 'notfound';
  };

  async function render(name) {
    hooks = []; resizers = [];
    clearInterval(cdTimer);
    if (heroObj) { heroObj.running = false; heroObj = null; }
    if (stopSmoke) { stopSmoke(); stopSmoke = null; }
    const page = await pages[name]();
    app.innerHTML = page.html;
    document.title = name === 'home' ? 'THE CIRCLE' : LABELS[name] + ' · THE CIRCLE';
    $$('#menu a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
    cur = target = 0; scrollTo(0, 0);
    observeReveals();
    page.after && page.after();
    current = name;
  }

  async function route(path, { first = false } = {}) {
    const name = routeName(path);
    if (first) { await render(name); return; }
    if (busy || name === current) return;
    busy = true;

    warpBoost = 1.8;
    if (window.__meteorShower) window.__meteorShower();

    app.classList.add('is-leaving');
    routeVeil.classList.add('active');
    await sleep(reduceMotion ? 0 : 320);

    await render(name);

    app.classList.remove('is-leaving');
    app.classList.add('is-entering');
    void app.offsetWidth;
    app.classList.remove('is-entering');
    routeVeil.classList.remove('active');

    await sleep(reduceMotion ? 0 : 380);
    busy = false;
  }

  function navigate(url) {
    const u = new URL(url, location.origin);
    if (u.pathname === location.pathname) { closeMenu(); return; }
    history.pushState({}, '', u.pathname);
    route(u.pathname);
    closeMenu();
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  });
  addEventListener('popstate', () => route(location.pathname));

  const burger = $('#burger'), menu = $('#menu');
  function closeMenu() { burger.classList.remove('open'); menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open'); menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
  });

  startIntro();
})();
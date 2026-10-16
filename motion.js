/* Lapisan gerak: A kamera terbang, B marquee velocity, C teks, D input, E reveal. */
const reduced = () => document.body.classList.contains('reduced');
const lightMode = () =>
  (navigator.hardwareConcurrency || 8) <= 4 ||
  (navigator.deviceMemory || 8) <= 4 ||
  (navigator.connection && navigator.connection.saveData);

let triggers = [];
let magneticHandlers = [];

gsap.registerPlugin(ScrollTrigger);

function killAll() {
  triggers.forEach(t => t.kill());
  triggers = [];
  magneticHandlers.forEach(([el, fn]) => el.removeEventListener('pointermove', fn));
  magneticHandlers = [];
  gsap.set('.hero, .mega, .marquee-track', { clearProps: 'all' });
}

/* C: scramble/decode */
function scramble(el) {
  const chars = '█▓▒░<>/\\|─═+#*';
  const orig = el.dataset.orig || el.textContent;
  el.dataset.orig = orig;
  let frame = 0;
  const total = 28;
  const iv = setInterval(() => {
    frame++;
    const p = frame / total;
    const cut = Math.floor(orig.length * p);
    let out = orig.slice(0, cut);
    for (let i = cut; i < orig.length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    el.textContent = out;
    if (frame >= total) { clearInterval(iv); el.textContent = orig; }
  }, 30);
}

function initMotion() {
  killAll();
  if (reduced()) return;

  /* A: kamera "terbang" — hero menukik saat scroll */
  if (!lightMode()) {
    triggers.push(ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate(self) {
        const p = self.progress;
        gsap.set('.hero', { scale: 1 + p * 0.22, rotation: -p * 2, transformOrigin: '50% 62%', opacity: 1 - p * 0.35 });
      },
    }));
    /* zoom-out ringan di footer */
    triggers.push(ScrollTrigger.create({
      trigger: '.footer', start: 'top bottom', end: 'top 40%', scrub: true,
      onUpdate(self) {
        gsap.set('.meja-wrap', { scale: 1 - self.progress * 0.04, transformOrigin: '50% 0%' });
      },
    }));
  }

  /* C: variable font weight judul — makin ditekan kapur */
  const mega = document.querySelector('.mega');
  triggers.push(ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: '60% top', scrub: true,
    onUpdate(self) {
      const w = Math.round(100 + self.progress * 800);
      mega.style.fontVariationSettings = `'wght' ${w}`;
    },
  }));

  /* C: scramble untuk subjudul & judul section */
  document.querySelectorAll('#hero-sub, #meja-judul, #cara-judul').forEach(el => {
    triggers.push(ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => { if (!reduced()) scramble(el); },
    }));
  });

  /* B: marquee miring mengikuti velocity scroll (set langsung, tanpa tween) */
  if (!lightMode()) {
    let lastSkew = 0;
    triggers.push(ScrollTrigger.create({
      onUpdate(self) {
        const v = Math.max(-24, Math.min(24, self.getVelocity() / 160));
        if (Math.abs(v - lastSkew) > 2) {
          lastSkew = v;
          gsap.set('.marquee-track', { skewY: -v });
        }
      },
    }));
  }

  /* D: magnetic buttons */
  if (matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      const fn = (e) => {
        if (reduced()) return;
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: dx * 0.25, y: dy * 0.25, duration: 0.3 });
      };
      const leave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1,0.5)' });
      btn.addEventListener('pointermove', fn);
      btn.addEventListener('pointerleave', leave);
      magneticHandlers.push([btn, fn]);
    });

    /* D: cursor shape-shift */
    const cur = document.getElementById('cursor');
    document.body.classList.add('cursor-on');
    const move = (e) => gsap.to(cur, { left: e.clientX, top: e.clientY, duration: 0.12 });
    window.addEventListener('pointermove', move);
    magneticHandlers.push([window, move]);
    document.querySelectorAll('.card, .btn, a, .day').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
  }

  ScrollTrigger.refresh();
}

/* E: reveal hasil — clip-path lingkaran */
window.__revealResult = (wrap) => {
  if (reduced()) { wrap.style.clipPath = 'none'; return; }
  gsap.fromTo(wrap, { clipPath: 'circle(0% at 50% 0%)' }, { clipPath: 'circle(142% at 50% 0%)', duration: 0.7, ease: 'power3.out' });
};

/* E: kartu aktif terangkat saat dipilih */
window.__announceCard = () => {
  if (reduced()) return;
  const active = document.querySelectorAll('.card')[window.__deckIndex || 0];
  if (active) gsap.fromTo(active, { y: -26 }, { y: 0, duration: 0.45, ease: 'back.out(1.6)', clearProps: 'y' });
};

window.__setMotion = () => { initMotion(); };

initMotion();

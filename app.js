import { PASARAN, RAMALAN, parseISO, wetonOf, ramalanJodoh, hariIstimewa, formatTanggalID } from './data.js';
import './motion.js';

/* ---------- helper DOM (tanpa innerHTML untuk data pengguna) ---------- */
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const STORE_KEY = 'weton.v1';
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return (o && typeof o === 'object' && o.v === 1) ? o : {};
  } catch { return {}; }
}
function saveStore(patch) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, ...loadStore(), ...patch })); } catch {}
}
const store = loadStore();

/* ---------- garis hari ini ---------- */
(function todayLine() {
  const now = new Date();
  const w = wetonOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const el = $('#today-line');
  el.textContent = `Hari ini: ${formatTanggalID(w)} — pasaran ${w.pasaran.nama}. Monggo dicek wetonmu.`;
})();

/* ---------- marquee sisi (nama pasaran, dua arah) ---------- */
(function sideMarquees() {
  const items = [];
  for (let r = 0; r < 6; r++) for (const p of PASARAN) items.push(p);
  for (const id of ['#mq-left', '#mq-right']) {
    const track = $(id);
    for (const p of items) {
      const s = h('span', null, `${p.nama} · neptu ${p.neptu} · `);
      track.appendChild(s);
    }
    for (const p of items) { // duplikat untuk loop mulus
      const s = h('span', null, `${p.nama} · neptu ${p.neptu} · `);
      s.setAttribute('aria-hidden', 'true');
      track.appendChild(s);
    }
  }
  const band = $('#band-1');
  const words = ['hitung wetonmu', 'lima pasaran', 'neptu', 'jumat kliwon', 'cocokkan', 'kalender jawa'];
  for (let r = 0; r < 4; r++) for (const wd of words) {
    const s = h('span', null, `${wd} ✦ `);
    if (r > 0) s.setAttribute('aria-hidden', 'true');
    band.appendChild(s);
  }
})();

/* ---------- DECK: kartu bertumpuk, flick dengan inertia ---------- */
const deck = $('#deck'), track = $('#track');
const cards = $$('.card', track);
const dotsBox = $('#dots'), statusEl = $('#deck-status');
let index = 0, x = 0, startX = 0, dragging = false, vel = 0, lastX = 0, lastT = 0, raf = 0;

cards.forEach((c, i) => {
  const b = h('button', null, String(i + 1));
  b.type = 'button'; b.setAttribute('role', 'tab');
  b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  b.setAttribute('aria-label', `Kartu ${i + 1}: ${$('h3', c).textContent}`);
  b.addEventListener('click', () => goTo(i, true));
  dotsBox.appendChild(b);
});
const dots = $$('button', dotsBox);

function cardW() { return cards[0].getBoundingClientRect().width + 16; }
function setX(px, announce = false) {
  x = px;
  track.style.transform = `translate3d(${px}px,0,0)`;
}
function goTo(i, user = false) {
  index = Math.max(0, Math.min(cards.length - 1, i));
  window.__deckIndex = index;
  cancelAnimationFrame(raf);
  const target = -index * cardW();
  const from = x, t0 = performance.now(), dur = 320;
  const step = (t) => {
    const p = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    setX(from + (target - from) * e);
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  dots.forEach((d, di) => d.setAttribute('aria-selected', di === index ? 'true' : 'false'));
  const title = $('h3', cards[index]).textContent;
  statusEl.textContent = `Kartu ${index + 1} dari ${cards.length}: ${title}`;
  if (user && window.__announceCard) window.__announceCard(title);
}

deck.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a, input, .day')) return;
  dragging = true; startX = e.clientX; lastX = e.clientX; lastT = performance.now(); vel = 0;
  cancelAnimationFrame(raf);
  deck.setPointerCapture(e.pointerId);
});
deck.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const now = performance.now();
  vel = 0.8 * vel + 0.2 * (dx / Math.max(now - lastT, 1)) * 16;
  lastX = e.clientX; lastT = now;
  setX(x + dx);
});
function endDrag() {
  if (!dragging) return;
  dragging = false;
  // inertia + snap: x negatif saat digeser ke kiri -> index naik
  let target = Math.round(-(x + vel * 14) / cardW());
  target = Math.max(0, Math.min(cards.length - 1, target));
  goTo(target, true);
}
deck.addEventListener('pointerup', endDrag);
deck.addEventListener('pointercancel', endDrag);
$('#deck-prev').addEventListener('click', () => goTo(index - 1, true));
$('#deck-next').addEventListener('click', () => goTo(index + 1, true));
deck.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1, true); }
  if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1, true); }
  if (e.key === 'Home') { e.preventDefault(); goTo(0, true); }
  if (e.key === 'End') { e.preventDefault(); goTo(cards.length - 1, true); }
});
deck.tabIndex = 0;
deck.setAttribute('role', 'region');
deck.setAttribute('aria-label', 'Tumpukan kartu alat. Geser atau pakai panah kiri kanan.');
window.addEventListener('resize', () => setX(-index * cardW()));

/* ---------- hasil kalkulator ---------- */
function renderWetonResult(box, w) {
  box.textContent = '';
  const wrap = h('div', 'reveal-clip');
  const stamp = h('div', 'stamp', `${w.hari} ${w.pasaran.nama}`);
  const neptu = h('p', 'neptu-big', `Neptu ${w.neptu}`);
  const dl = h('dl', 'kv');
  const rows = [
    ['Tanggal', formatTanggalID(w)],
    ['Pasaran', `${w.pasaran.nama} (neptu ${w.pasaran.neptu})`],
    ['Watak', w.pasaran.watak],
    ['Warna', w.pasaran.warna],
    ['Arah', w.pasaran.arah],
  ];
  for (const [k, v] of rows) {
    const dt = h('dt', null, k); const dd = h('dd', null, v);
    dl.appendChild(dt); dl.appendChild(dd);
  }
  const note = h('p', 'hand', '— dicatat juru kunci');
  wrap.append(stamp, neptu, dl, note);
  if (w.iso === '1945-08-17') {
    const egg = h('p', 'stamp', '★ hari lahir indonesia ★');
    egg.style.fontSize = '1.1rem';
    wrap.appendChild(egg);
    const eggNote = h('p', 'hand', 'eh, tanggal proklamasi! wetonnya sama kayak hari ini. kebetulan? monggo direnungkan.');
    wrap.appendChild(eggNote);
  }
  box.appendChild(wrap);
  if (window.__revealResult) window.__revealResult(wrap);
}

function showError(input, errBox, msg) {
  errBox.textContent = msg;
  errBox.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.focus();
}
function clearError(input, errBox) {
  errBox.hidden = true; errBox.textContent = '';
  input.removeAttribute('aria-invalid');
}

$('#form-weton').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#in-tgl'), errBox = $('#err-tgl');
  clearError(input, errBox);
  const v = input.value.trim();
  if (!v) return showError(input, errBox, 'Tanggalnya belum diisi — juru kunci tidak bisa nerawang tanpa tanggal.');
  const w = parseISO(v);
  if (!w) return showError(input, errBox, 'Tanggalnya kok aneh… coba dicek lagi ya, jangan ngasal. (1900–2100 saja)');
  renderWetonResult($('#res-weton'), w);
  saveStore({ lastTgl: w.iso });
  history.replaceState(null, '', `?tgl=${w.iso}`);
});

/* ---------- cocokkan ---------- */
function renderCocok(box, a, b) {
  box.textContent = '';
  const wrap = h('div', 'reveal-clip');
  const r = ramalanJodoh(a.neptu, b.neptu);
  const stamp = h('div', 'stamp', r.nama);
  const dl = h('dl', 'kv');
  const rows = [
    ['Pertama', `${a.hari} ${a.pasaran.nama} (neptu ${a.neptu})`],
    ['Kedua', `${b.hari} ${b.pasaran.nama} (neptu ${b.neptu})`],
    ['Jumlah neptu', String(a.neptu + b.neptu)],
    ['Kata tradisi', r.arti],
  ];
  for (const [k, v] of rows) {
    const dt = h('dt', null, k); const dd = h('dd', null, v);
    dl.appendChild(dt); dl.appendChild(dd);
  }
  wrap.append(stamp, dl);
  box.appendChild(wrap);
  if (window.__revealResult) window.__revealResult(wrap);
}

$('#form-cocok').addEventListener('submit', (e) => {
  e.preventDefault();
  const ia = $('#in-a'), ib = $('#in-b'), errBox = $('#err-cocok');
  clearError(ia, errBox); clearError(ib, errBox);
  if (!ia.value) return showError(ia, errBox, 'Tanggal pertama belum diisi.');
  if (!ib.value) return showError(ib, errBox, 'Tanggal kedua belum diisi.');
  const a = parseISO(ia.value), b = parseISO(ib.value);
  if (!a || !b) {
    const bad = !a ? ia : ib;
    return showError(bad, errBox, 'Ada tanggal yang tidak valid — dicek lagi ya (1900–2100).');
  }
  renderCocok($('#res-cocok'), a, b);
  history.replaceState(null, '', `?a=${a.iso}&b=${b.iso}`);
});

/* ---------- salin link (dengan fallback) ---------- */
async function copyText(t, btn) {
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = h('textarea'); ta.value = t; document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  btn.textContent = 'Tersalin!';
  setTimeout(() => { btn.textContent = label; }, 1600);
}
$('#btn-share').addEventListener('click', (e) => {
  const v = $('#in-tgl').value || store.lastTgl;
  if (!v) { showError($('#in-tgl'), $('#err-tgl'), 'Isi tanggal dulu baru link-nya bisa disalin.'); return; }
  copyText(`${location.origin}${location.pathname}?tgl=${v}`, e.currentTarget);
});
$('#btn-share2').addEventListener('click', (e) => {
  const a = $('#in-a').value, b = $('#in-b').value;
  if (!a || !b) { showError($('#in-a'), $('#err-cocok'), 'Isi kedua tanggal dulu baru link-nya bisa disalin.'); return; }
  copyText(`${location.origin}${location.pathname}?a=${a}&b=${b}`, e.currentTarget);
});

/* ---------- kalender 30 hari ---------- */
(function calendar() {
  const box = $('#cal');
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const w = wetonOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const b = h('button', 'day' + (hariIstimewa(w) ? ' istimewa' : ''));
    b.type = 'button';
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `${formatTanggalID(w)}, pasaran ${w.pasaran.nama}${hariIstimewa(w) ? ', malam istimewa' : ''}. Klik untuk menghitung weton.`);
    const num = h('strong', null, String(w.d));
    const ps = h('span', null, w.pasaran.nama + (hariIstimewa(w) ? ' ★' : ''));
    b.append(num, ps);
    b.addEventListener('click', () => {
      $('#in-tgl').value = w.iso;
      goTo(0, true);
      $('#form-weton').requestSubmit();
      document.querySelector('#meja').scrollIntoView({ behavior: store.motion === false ? 'auto' : 'smooth' });
    });
    box.appendChild(b);
  }
})();

/* ---------- daftar lima pasaran ---------- */
(function pasaranList() {
  const ul = $('#pasaran-list');
  for (const p of PASARAN) {
    const li = h('li');
    const pn = h('span', 'pn', p.nama);
    const np = h('span', 'np', `neptu ${p.neptu} · ${p.warna} · ${p.arah}`);
    const wt = h('span', 'wt', p.watak);
    li.append(pn, np, wt);
    ul.appendChild(li);
  }
})();

/* ---------- deep-link ---------- */
(function deepLink() {
  const q = new URLSearchParams(location.search);
  const t = q.get('tgl');
  if (t && parseISO(t)) {
    $('#in-tgl').value = t;
    $('#form-weton').requestSubmit();
    goTo(0);
    return;
  }
  const a = q.get('a'), b = q.get('b');
  if (a && b && parseISO(a) && parseISO(b)) {
    $('#in-a').value = a; $('#in-b').value = b;
    $('#form-cocok').requestSubmit();
    goTo(1);
  } else if (store.lastTgl && parseISO(store.lastTgl)) {
    $('#in-tgl').value = store.lastTgl;
  }
})();

/* ---------- toggle gerak & marquee ---------- */
const motionBtn = $('#btn-motion'), mqBtn = $('#btn-marquee');
function applyMotion() {
  const off = store.motion === false;
  document.body.classList.toggle('reduced', off);
  motionBtn.setAttribute('aria-pressed', String(!off));
  motionBtn.textContent = off ? 'Gerak: mati' : 'Gerak: nyala';
  if (window.__setMotion) window.__setMotion(!off);
}
function applyMarquee() {
  const off = store.marquee === false;
  document.body.classList.toggle('no-marquee', off);
  mqBtn.setAttribute('aria-pressed', String(!off));
  mqBtn.textContent = off ? 'Teks berjalan: mati' : 'Teks berjalan: nyala';
}
motionBtn.addEventListener('click', () => { saveStore({ motion: !(store.motion !== false) }); store.motion = store.motion !== false ? false : true; applyMotion(); });
mqBtn.addEventListener('click', () => { saveStore({ marquee: !(store.marquee !== false) }); store.marquee = store.marquee !== false ? false : true; applyMarquee(); });
if (matchMedia('(prefers-reduced-motion: reduce)').matches && store.motion === undefined) {
  store.motion = false;
}
applyMotion(); applyMarquee();

/* CTA hero -> kartu 0 */
$$('[data-target]').forEach(a => a.addEventListener('click', () => goTo(+a.dataset.target, true)));

setX(0);
statusEl.textContent = `Kartu 1 dari ${cards.length}: ${$('h3', cards[0]).textContent}`;

// Hey Jude Cafe — shared script for every page
(function () {
  const SUPABASE_URL = 'https://ftfdbpimbxncmfzafvxc.supabase.co';
  // Publishable key: designed to be public. Row Level Security protects the data.
  const SUPABASE_KEY = 'sb_publishable_8y1OjSQPjQIA1yexrI-Nog_PUdm-Fus';
  const CAFE_TZ = 'Pacific/Auckland';

  async function api(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((body && body.message) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const price = (n) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(Number(n));
  const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Opening hours. Must match private.opening_hours() in the database.
  const hours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    .map((day) => ({ day, open: '07:00', close: '15:00' }));
  const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function formatTime(value) {
    const mins = typeof value === 'number' ? value : toMinutes(value);
    const h = Math.floor(mins / 60), m = mins % 60;
    const h12 = ((h + 11) % 12) + 1;
    const suffix = h < 12 ? 'am' : 'pm';
    return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
  }
  function cafeNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', {
      timeZone: CAFE_TZ, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { day: p.weekday, date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const hoursFor = (dayName) => hours.find((h) => h.day === dayName);
  const dayNameOf = (isoDate) => new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', timeZone: 'UTC' });
  function openStatus() {
    const now = cafeNow();
    const today = hoursFor(now.day);
    if (now.minutes >= toMinutes(today.open) && now.minutes < toMinutes(today.close)) {
      return { open: true, text: `Open now until ${formatTime(today.close)}` };
    }
    if (now.minutes < toMinutes(today.open)) return { open: false, text: `Closed. Opens today at ${formatTime(today.open)}` };
    const next = hours[(hours.indexOf(today) + 1) % 7];
    return { open: false, text: `Closed. Opens tomorrow at ${formatTime(next.open)}` };
  }

  // Every element marked data-status shows the live open/closed status
  function renderStatus() {
    const status = openStatus();
    document.querySelectorAll('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', status.open);
      const text = el.querySelector('[data-status-text]') || el;
      text.textContent = status.text;
    });
    document.dispatchEvent(new CustomEvent('hj:status', { detail: status }));
    return status;
  }

  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(message, isError = false) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.toggle('error', isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5000);
  }

  window.HJ = { api, escapeHtml, price, slug, hours, toMinutes, formatTime, cafeNow, hoursFor, dayNameOf, openStatus, renderStatus, toast };

  // ----- Header: mobile menu and scrolled border
  const header = document.getElementById('siteHeader');
  const nav = document.getElementById('siteNav');
  const toggle = document.getElementById('menuToggle');
  function setNav(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  }
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); toggle.focus(); } });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { header.classList.toggle('scrolled', window.scrollY > 8); ticking = false; });
  }, { passive: true });

  // ----- Section entrances: once, just before fully in view
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  renderStatus();
  setInterval(renderStatus, 60000);
})();

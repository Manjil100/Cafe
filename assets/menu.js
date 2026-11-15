// Menu page: live menu from the shared database, one tab per category.
// /menu#breakfast opens the Breakfast tab directly.
(function () {
  const { api, escapeHtml, price, slug } = window.HJ;
  const tabsEl = document.getElementById('menuTabs');
  const board = document.getElementById('menuBoard');
  const wrap = document.getElementById('boardWrap');
  const dish = document.getElementById('dishPhoto');
  const state = { categories: [], items: [], shownId: null, side: null };
  const sideOf = (i) => String.fromCharCode(65 + i); // 0 -> A, 1 -> B ...

  // The record beside the tabs turns over to the new side when you change tabs
  const record = document.getElementById('sideRecord');
  const letter = record.querySelector('.side-letter');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let flipTimer;
  function flipTo(side) {
    if (state.side === side) return;
    const first = state.side === null;
    state.side = side;
    clearTimeout(flipTimer);
    if (first || still.matches) { letter.textContent = side; return; }
    record.classList.remove('flipping'); void record.offsetWidth; record.classList.add('flipping');
    flipTimer = setTimeout(() => { letter.textContent = side; }, 260);
  }
  record.addEventListener('animationend', () => record.classList.remove('flipping'));

  const photoFor = (item) => (item && item.image_url
    ? { full: item.image_url, sm: item.image_url.replace(/\.webp$/, '-sm.webp') } : null);

  function showDish(item) {
    const photo = photoFor(item);
    if (!photo || state.shownId === item.id) return;
    state.shownId = item.id;
    const img = dish.querySelector('img');
    img.srcset = `${photo.sm} 600w, ${photo.full} 1200w`;
    img.sizes = '(max-width: 860px) 100vw, 40vw';
    img.src = photo.full;
    img.alt = item.name;
    dish.querySelector('figcaption').textContent = item.name;
    board.querySelectorAll('.board-item').forEach((el) => el.classList.toggle('is-shown', Number(el.dataset.id) === item.id));
  }

  function select(categoryId, { updateHash = true } = {}) {
    const cat = state.categories.find((c) => c.id === categoryId);
    tabsEl.querySelectorAll('.tab').forEach((tab) => {
      const on = Number(tab.dataset.cat) === categoryId;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) board.setAttribute('aria-labelledby', tab.id);
    });
    flipTo(sideOf(state.categories.indexOf(cat)));
    state.current = categoryId;
    renderItems(state.items.filter((i) => i.category_id === categoryId));
    if (updateHash && cat) history.replaceState(null, '', `#${slug(cat.name)}`);
  }

  // Draws a list of dishes on the board. Search results also show which side they're on.
  function renderItems(items, { showSide = false } = {}) {
    board.innerHTML = items.map((item) => {
      const photo = photoFor(item);
      const i = state.categories.findIndex((c) => c.id === item.category_id);
      const side = showSide && i >= 0 ? `<p class="from-side">Side ${sideOf(i)}, ${escapeHtml(state.categories[i].name)}</p>` : '';
      return `<article class="board-item${photo ? ' has-photo' : ''}" data-id="${item.id}">
        ${photo ? `<img class="board-thumb" src="${photo.sm}" alt="" width="600" height="450" loading="lazy" decoding="async">` : ''}
        ${side}<div class="board-line"><h3>${escapeHtml(item.name)}</h3><span class="leader" aria-hidden="true"></span><span class="price">${price(item.price)}</span></div>
        <p>${escapeHtml(item.description)}</p>
        <p class="prep">Ready in about ${Number(item.prep_time_minutes)} min</p>
      </article>`;
    }).join('');

    const withPhotos = items.filter(photoFor);
    wrap.classList.toggle('no-photo', withPhotos.length === 0);
    dish.hidden = withPhotos.length === 0;
    state.shownId = null;
    if (withPhotos.length) showDish(withPhotos[0]);
    board.querySelectorAll('.board-item.has-photo').forEach((el) => {
      el.addEventListener('mouseenter', () => showDish(state.items.find((i) => i.id === Number(el.dataset.id))));
    });
  }

  // ----- Search across every side of the menu
  const search = document.getElementById('menuSearch');
  const searchStatus = document.getElementById('searchStatus');
  const deck = document.querySelector('.deck');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function runSearch() {
    const q = norm(search.value.trim());
    if (!state.categories.length) return;
    if (!q) {
      deck.classList.remove('is-searching');
      searchStatus.textContent = '';
      select(state.current, { updateHash: false });
      return;
    }
    deck.classList.add('is-searching');
    const words = q.split(/\s+/);
    const found = state.items.filter((item) => {
      const hay = norm(`${item.name} ${item.description}`);
      return words.every((w) => hay.includes(w));
    });
    renderItems(found, { showSide: true });
    if (!found.length) {
      board.innerHTML = `<p class="board-msg">Nothing on the menu matches “${escapeHtml(search.value.trim())}”. Try a single word, like eggs or coffee.</p>`;
    }
    searchStatus.textContent = found.length === 1 ? '1 dish matches' : `${found.length} dishes match`;
  }
  let searchTimer;
  search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 120); });
  // Choosing a side clears the search
  tabsEl.addEventListener('click', () => {
    if (search.value) { search.value = ''; deck.classList.remove('is-searching'); searchStatus.textContent = ''; }
  }, true);

  // Grey placeholder rows while the menu loads
  const skeleton = () => Array.from({ length: 4 }, () =>
    '<div class="board-item skeleton" aria-hidden="true"><span class="sk sk-line"></span><span class="sk sk-text"></span><span class="sk sk-short"></span></div>').join('');

  async function load() {
    board.innerHTML = `<p class="sr-only">Loading today’s menu…</p>${skeleton()}`;
    try {
      const [categories, items] = await Promise.all([
        api('/rest/v1/categories?select=id,name,sort_order&order=sort_order.asc'),
        api('/rest/v1/menu_items?select=id,category_id,name,description,price,prep_time_minutes,image_url&is_available=eq.true&order=name.asc'),
      ]);
      state.items = items;
      state.categories = categories.filter((c) => items.some((i) => i.category_id === c.id));
      if (!state.categories.length) {
        board.innerHTML = '<p class="board-msg">The menu is being updated. Check back soon.</p>';
        return;
      }
      tabsEl.innerHTML = state.categories.map((c, i) =>
        `<button type="button" class="tab" role="tab" id="tab-${slug(c.name)}" data-cat="${c.id}" aria-controls="menuBoard"><span class="tab-side">Side ${sideOf(i)}</span>${escapeHtml(c.name)}</button>`).join('');
      const tabs = [...tabsEl.querySelectorAll('.tab')];
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(Number(tab.dataset.cat)));
        tab.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          next.focus();
          select(Number(next.dataset.cat));
        });
      });
      const fromHash = state.categories.find((c) => `#${slug(c.name)}` === location.hash);
      select((fromHash || state.categories[0]).id, { updateHash: Boolean(fromHash) });
    } catch (err) {
      console.error('Menu failed to load', err);
      board.innerHTML = '<p class="board-msg">The menu couldn’t load right now.<button type="button" id="menuRetry">Try again</button></p>';
      document.getElementById('menuRetry').addEventListener('click', load);
    }
  }

  window.addEventListener('hashchange', () => {
    const c = state.categories.find((x) => `#${slug(x.name)}` === location.hash);
    if (c) select(c.id, { updateHash: false });
  });

  // Live kitchen wait from the ordering system, only while the café is open
  const waitEl = document.getElementById('kitchenWait');
  async function loadWait(status) {
    if (!status.open) { waitEl.textContent = ''; return; }
    try {
      const w = await api('/rest/v1/rpc/get_kitchen_wait', { method: 'POST', body: '{}' });
      waitEl.textContent = w.queue_minutes > 0 ? `The kitchen is about ${w.queue_minutes} minutes behind right now.` : 'No wait in the kitchen right now.';
    } catch { waitEl.textContent = ''; }
  }
  document.addEventListener('hj:status', (e) => loadWait(e.detail));
  loadWait(window.HJ.openStatus());

  load();
})();

// Home page: three dishes with photos, straight from the live menu.
(function () {
  const { api, escapeHtml, price, slug } = window.HJ;
  const list = document.getElementById('featured');
  const preferred = ['Benny Supreme', 'Eggs Benedict', 'Smashed Avocado', 'Big Breakfast', 'Flat White', 'Blueberry Muffin'];

  async function load() {
    try {
      const [items, categories] = await Promise.all([
        api('/rest/v1/menu_items?select=id,name,description,price,image_url,category_id&is_available=eq.true&image_url=not.is.null'),
        api('/rest/v1/categories?select=id,name'),
      ]);
      const rank = (i) => { const p = preferred.indexOf(i.name); return p === -1 ? 99 : p; };
      const picks = items.sort((a, b) => rank(a) - rank(b)).slice(0, 3);
      if (!picks.length) { list.closest('section').hidden = true; return; }
      const catName = (id) => (categories.find((c) => c.id === id) || {}).name || '';
      list.innerHTML = picks.map((i) => {
        const sm = i.image_url.replace(/\.webp$/, '-sm.webp');
        return `<a class="dish-card" href="/menu#${slug(catName(i.category_id))}">
          <div class="frame"><img src="${sm}" srcset="${sm} 600w, ${i.image_url} 1200w" sizes="(max-width: 860px) 76vw, 30vw" alt="${escapeHtml(i.name)}" width="600" height="750" loading="lazy" decoding="async"></div>
          <h3><span>${escapeHtml(i.name)}</span><span class="price">${price(i.price)}</span></h3>
          <p>${escapeHtml(i.description)}</p>
        </a>`;
      }).join('');
    } catch (err) {
      console.error('Featured dishes failed to load', err);
      list.innerHTML = '<p class="muted">Today’s dishes couldn’t load. <a class="link" href="/menu">See the full menu</a>.</p>';
    }
  }
  load();
})();

// About page: photo viewer for the "On the walls" gallery.
(function () {
  const photos = [...document.querySelectorAll('#walls button')];
  const box = document.getElementById('lightbox');
  if (!photos.length || !box) return;
  const img = box.querySelector('img');
  const caption = document.getElementById('lightboxCaption');
  let index = 0;
  function show(i) {
    index = (i + photos.length) % photos.length;
    const b = photos[index];
    img.src = b.dataset.full;
    img.alt = b.querySelector('img').alt;
    caption.textContent = b.dataset.caption;
  }
  photos.forEach((b, i) => b.addEventListener('click', () => { show(i); box.showModal(); }));
  document.getElementById('lbPrev').addEventListener('click', () => show(index - 1));
  document.getElementById('lbNext').addEventListener('click', () => show(index + 1));
  document.getElementById('lbClose').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
})();

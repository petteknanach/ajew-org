(() => {
  'use strict';
  const get = (id) => document.getElementById(`stones-${id}`);
  const image = get('image');
  if (!image) return;
  const total = 126;
  const queryPage = Number(new URLSearchParams(location.search).get('page'));
  let page = Number.isInteger(queryPage) && queryPage >= 1 && queryPage <= total ? queryPage : 1;
  let zoom = 1;
  function render(updateUrl = true) {
    image.src = `/reader/precious-stones/pages/page-${String(page).padStart(3, '0')}.webp`;
    image.alt = `Precious Stones — original Hebrew page ${page}`;
    image.style.width = `${zoom * 100}%`;
    get('page').value = String(page);
    get('prev').disabled = page === 1;
    get('next').disabled = page === total;
    get('status').textContent = `Page ${page} of ${total}`;
    get('original').href = `/reader/precious-stones/Avanim_Tovos_Hebrew_High_Resolution_Book_Only.pdf#page=${page}`;
    get('viewport').scrollTop = 0;
    get('viewport').scrollLeft = 0;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('page', String(page));
      history.replaceState(null, '', url);
    }
  }
  function move(delta) { page = Math.min(total, Math.max(1, page + delta)); render(); }
  get('prev').addEventListener('click', () => move(-1));
  get('next').addEventListener('click', () => move(1));
  get('jump').addEventListener('submit', (event) => {
    event.preventDefault();
    const target = Number(get('page').value);
    if (Number.isInteger(target) && target >= 1 && target <= total) { page = target; render(); }
  });
  get('zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + .25); image.style.width = `${zoom * 100}%`; });
  get('zoom-out').addEventListener('click', () => { zoom = Math.max(1, zoom - .25); image.style.width = `${zoom * 100}%`; });
  get('fit').addEventListener('click', () => { zoom = 1; image.style.width = '100%'; });
  image.addEventListener('error', () => { get('status').textContent = `Page ${page} preview could not load. Use the original PDF link above.`; });
  render(false);
})();

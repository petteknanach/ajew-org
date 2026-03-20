/* Gallery Lightbox - ajew.org */
(function() {
  // Create lightbox overlay
  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML =
    '<div class="lightbox-close">&times;</div>' +
    '<div class="lightbox-prev">&lsaquo;</div>' +
    '<div class="lightbox-next">&rsaquo;</div>' +
    '<div class="lightbox-content">' +
      '<img class="lightbox-img" src="" alt="" />' +
      '<div class="lightbox-caption"></div>' +
      '<div class="lightbox-actions">' +
        '<a class="lightbox-download" href="" download title="Download image">&#x2B07; Download</a>' +
        '<span class="lightbox-counter"></span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var img = overlay.querySelector('.lightbox-img');
  var caption = overlay.querySelector('.lightbox-caption');
  var download = overlay.querySelector('.lightbox-download');
  var counter = overlay.querySelector('.lightbox-counter');
  var allItems = [];
  var currentIndex = 0;

  function collectItems() {
    allItems = Array.from(document.querySelectorAll('.gallery-item'));
  }

  function openLightbox(index) {
    if (index < 0 || index >= allItems.length) return;
    currentIndex = index;
    var item = allItems[index];
    var itemImg = item.querySelector('img');
    var itemCaption = item.querySelector('.caption');
    var src = itemImg.getAttribute('src');

    img.src = src;
    img.alt = itemImg.alt || '';
    caption.textContent = itemCaption ? itemCaption.textContent : itemImg.alt || '';
    download.href = src;
    download.setAttribute('download', src.split('/').pop());
    counter.textContent = (index + 1) + ' / ' + allItems.length;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    img.src = '';
  }

  function showPrev() {
    if (currentIndex > 0) openLightbox(currentIndex - 1);
    else openLightbox(allItems.length - 1);
  }

  function showNext() {
    if (currentIndex < allItems.length - 1) openLightbox(currentIndex + 1);
    else openLightbox(0);
  }

  // Event listeners
  overlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  overlay.querySelector('.lightbox-prev').addEventListener('click', function(e) { e.stopPropagation(); showPrev(); });
  overlay.querySelector('.lightbox-next').addEventListener('click', function(e) { e.stopPropagation(); showNext(); });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') showPrev();
    else if (e.key === 'ArrowRight') showNext();
  });

  // Touch swipe support
  var touchStartX = 0;
  overlay.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  overlay.addEventListener('touchend', function(e) {
    var diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) showPrev();
      else showNext();
    }
  }, { passive: true });

  // Initialize
  collectItems();
  allItems.forEach(function(item, i) {
    item.style.cursor = 'pointer';
    item.addEventListener('click', function(e) {
      e.preventDefault();
      openLightbox(i);
    });
  });

  // Inject styles
  var style = document.createElement('style');
  style.textContent =
    '.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }' +
    '.lightbox-overlay.open { opacity: 1; pointer-events: auto; }' +
    '.lightbox-close { position: absolute; top: 15px; right: 20px; color: #fff; font-size: 40px; cursor: pointer; z-index: 10001; line-height: 1; padding: 5px 12px; border-radius: 50%; transition: background 0.2s; }' +
    '.lightbox-close:hover { background: rgba(255,255,255,0.15); }' +
    '.lightbox-prev, .lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); color: #fff; font-size: 48px; cursor: pointer; padding: 20px 16px; z-index: 10001; user-select: none; border-radius: 8px; transition: background 0.2s; }' +
    '.lightbox-prev { left: 10px; }' +
    '.lightbox-next { right: 10px; }' +
    '.lightbox-prev:hover, .lightbox-next:hover { background: rgba(255,255,255,0.1); }' +
    '.lightbox-content { max-width: 90vw; max-height: 90vh; text-align: center; display: flex; flex-direction: column; align-items: center; }' +
    '.lightbox-img { max-width: 85vw; max-height: 78vh; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 30px rgba(0,0,0,0.5); }' +
    '.lightbox-caption { color: #ddd; font-size: 1rem; margin-top: 12px; max-width: 600px; line-height: 1.4; }' +
    '.lightbox-actions { display: flex; align-items: center; gap: 20px; margin-top: 10px; }' +
    '.lightbox-download { color: #fff; background: rgba(255,255,255,0.15); padding: 8px 20px; border-radius: 6px; text-decoration: none; font-size: 0.95rem; font-weight: 600; transition: background 0.2s; }' +
    '.lightbox-download:hover { background: rgba(255,255,255,0.25); }' +
    '.lightbox-counter { color: #888; font-size: 0.85rem; }' +
    '@media (max-width: 768px) {' +
      '.lightbox-prev, .lightbox-next { font-size: 32px; padding: 12px 8px; }' +
      '.lightbox-prev { left: 2px; }' +
      '.lightbox-next { right: 2px; }' +
      '.lightbox-img { max-width: 95vw; max-height: 72vh; }' +
      '.lightbox-close { top: 8px; right: 10px; font-size: 32px; }' +
    '}';
  document.head.appendChild(style);
})();

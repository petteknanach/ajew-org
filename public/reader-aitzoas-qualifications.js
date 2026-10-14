// Route-local apparatus exclusion; canonical Reader runtimes/actions stay unchanged.
(function () {
  'use strict';
  function activeRoute() {
    return /^\/reader\/aitzoas-yeshuroas\/1\/\d+\/?$/.test(window.location.pathname);
  }
  if (!activeRoute()) return;
  var warning = document.getElementById('translation-review-warning');
  if (!warning || warning.dataset.aitzoasQualificationGuard === '20261014-r11') return;
  warning.dataset.aitzoasQualificationGuard = '20261014-r11';

  function validRange(range) {
    // intersectsNode(false) alone also accepts disconnected/different-root ranges.
    return range && range.startContainer && range.endContainer &&
      range.startContainer.isConnected && range.endContainer.isConnected &&
      range.startContainer.getRootNode() === document &&
      range.endContainer.getRootNode() === document &&
      warning.isConnected && warning.getRootNode() === document &&
      !range.intersectsNode(warning);
  }

  function inspectSelection() {
    if (!activeRoute()) return { state: 'inactive' };
    try {
      var selection = window.getSelection();
      if (!selection || selection.isCollapsed) return { state: 'empty' };
      if (!selection.rangeCount) return { state: 'unsafe' };
      var ranges = [];
      for (var i = 0; i < selection.rangeCount; i++) {
        var range = selection.getRangeAt(i);
        if (!validRange(range)) return { state: 'unsafe' };
        ranges.push(range.cloneRange());
      }
      return { state: 'safe', ranges: ranges };
    } catch (_) { return { state: 'unsafe' }; }
  }

  function hidePopups() {
    document.querySelectorAll('.selection-popup').forEach(function (popup) {
      popup.style.display = 'none';
    });
  }

  var menuSources = new WeakMap();
  function admittedMenu(menu) {
    var source = menuSources.get(menu);
    try {
      return source && source.state === 'safe' && source.ranges.every(validRange);
    } catch (_) { return false; }
  }

  function reject(event, menu) {
    if (menu) menu.style.display = 'none';
    hidePopups();
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  // v2 reads/caches text, positions and appends synchronously, including from
  // its 800ms timer. Bind the range provenance at that exact insertion, NOT at
  // a later MutationObserver callback or from the selection at action time.
  // A later safe/empty selection cannot launder an unsafe cached text closure.
  // Only this body instance's appendChild is wrapped, and only the inherited
  // menu is inspected. No Selection, timer, prototype or shared callback patch.
  var body = document.body;
  var appendChild = body.appendChild;
  body.appendChild = function (node) {
    if (activeRoute() && node && node.id === 'highlight-context-menu' &&
        node.classList.contains('highlight-context-menu')) {
      menuSources.set(node, inspectSelection());
      if (!admittedMenu(node)) node.style.display = 'none';
      // Capture on the menu itself also protects a retained/detached node.
      node.addEventListener('click', function (event) {
        if (!activeRoute()) return;
        if (!admittedMenu(node) || inspectSelection().state === 'unsafe') reject(event, node);
      }, true);
    }
    return appendChild.call(this, node);
  };

  function hideIfUnsafe() {
    if (!activeRoute()) return;
    var state = inspectSelection().state;
    if (state !== 'safe') hidePopups();
    document.querySelectorAll('.highlight-context-menu').forEach(function (menu) {
      if (!admittedMenu(menu) || state === 'unsafe') menu.style.display = 'none';
    });
  }

  var pendingHide;
  document.addEventListener('selectionchange', function () {
    hideIfUnsafe();
    // The unchanged generic Reader queues its popup update for 10ms.
    clearTimeout(pendingHide);
    pendingHide = setTimeout(hideIfUnsafe, 20);
  }, true);

  ['mouseup', 'dblclick', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, function (event) {
      if (inspectSelection().state !== 'unsafe') return;
      hideIfUnsafe();
      // In particular stop the actual v2 target invocation, not its timers.
      event.stopImmediatePropagation();
    }, true);
  });

  document.addEventListener('copy', function (event) {
    if (inspectSelection().state !== 'unsafe') return;
    // Noncanonical selections can still be copied plainly, never attributed.
    event.stopImmediatePropagation();
    if (event.clipboardData) {
      try {
        var selection = window.getSelection();
        event.clipboardData.setData('text/plain', selection ? selection.toString() : '');
      } catch (_) { event.clipboardData.setData('text/plain', ''); }
      event.preventDefault();
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (!activeRoute()) return;
    var target = event.target;
    if (target && !target.closest) target = target.parentElement;
    if (!target) return;
    var menu = target.closest('.highlight-context-menu');
    if (menu) {
      // Unknown menus are fail-closed; safe cached menus may survive empty
      // Selection (normal clicking), but must retain their own safe ranges.
      if (!admittedMenu(menu) || inspectSelection().state === 'unsafe') reject(event, menu);
      return;
    }
    if (!target.closest('.selection-popup')) return;
    // Generic popup callbacks read live Selection, unlike the cached v2 menu.
    if (inspectSelection().state !== 'safe') reject(event);
  }, true);
})();

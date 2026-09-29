/* ============================================================================
 * ContractNest Extend — website embed (v2)
 * ============================================================================
 * Framework-proof by design: one script tag. Works in plain HTML, React,
 * Angular, WordPress, server-rendered pages — anything that outputs HTML.
 * Identity, OTP and the contract stay on the ContractNest origin, never the
 * host page. The card, the package page and the checkout all render inside
 * our frame, so a third-party site cannot break them.
 *
 *   <script src="https://<app-host>/embed.js" data-storefront="sf-…" async></script>
 *   <script src="https://<app-host>/embed.js" data-vani="vn-…" async></script>
 *
 * data-vani puts VaNi on the page: a floating bubble (bottom-right) that opens
 * the chat panel. One tag per page; it knows every published package. Needs
 * VaNi on for the tenant. data-view="bubble" on a storefront tag does the
 * same, scoped to that storefront's packages.
 *
 * Attributes (all optional — the storefront's own card style is the default):
 *   data-view="button|card|catalog|bubble"   button = a native button styled below;
 *                                      card / catalog = the package card(s)
 *                                      in an iframe sized to content
 *   data-label="Buy now"               button / primary text
 *   data-color="#4F46E5"               brand colour
 *   data-shape="pill|rounded|square"   corner radius
 *   data-mode="overlay|link"           what a click opens (default overlay;
 *                                      small screens always get a new tab)
 *
 * For developers (nothing else is exposed):
 *   ContractNest.open('sf-…')                       open the checkout
 *   ContractNest.mount(el, { storefront: 'sf-…', view: 'card', label, color, shape, mode })
 * ========================================================================== */
(function () {
  'use strict';

  var PROCESSED = 'cnExtendProcessed';
  var ORIGIN = '';
  var VIEWS = { button: 1, card: 1, catalog: 1, bubble: 1 };
  var bubbleMounted = false;
  var SHAPES = { pill: '999px', rounded: '10px', square: '3px' };
  var frames = {}; // frame id → { frame, mode }
  var seq = 0;

  function originOf(script) {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  }
  function currentOrigin() {
    if (ORIGIN) return ORIGIN;
    var s = document.currentScript || document.querySelector('script[data-storefront][src*="embed.js"]') || document.querySelector('script[src*="embed.js"]');
    ORIGIN = s ? originOf(s) : '';
    return ORIGIN;
  }
  function q(params) {
    var parts = [];
    for (var k in params) if (params[k] != null && params[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return parts.length ? '?' + parts.join('&') : '';
  }
  function inkOn(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72 ? '#1a1816' : '#fff';
  }

  /* ── the checkout overlay ── */
  function openOverlay(url) {
    var overlay = document.createElement('div');
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'background:rgba(26,24,22,0.64)', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:16px'
    ].join(';'));
    var frame = document.createElement('iframe');
    frame.src = url;
    frame.setAttribute('style', [
      'width:100%', 'max-width:560px', 'height:min(760px,94vh)',
      'border:0', 'border-radius:16px', 'background:#f7f5f2',
      'box-shadow:0 24px 64px rgba(0,0,0,0.4)'
    ].join(';'));
    frame.setAttribute('allow', 'payment');
    var close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.setAttribute('style', [
      'position:absolute', 'top:14px', 'right:18px', 'width:36px', 'height:36px',
      'border:0', 'border-radius:50%', 'background:rgba(255,255,255,0.16)',
      'color:#fff', 'font-size:22px', 'line-height:36px', 'cursor:pointer'
    ].join(';'));
    function dismiss() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') dismiss(); }
    close.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', onKey);
    overlay.appendChild(frame);
    overlay.appendChild(close);
    document.body.appendChild(overlay);
  }

  function openUrl(url, mode) {
    // Small screens get the full tab — an overlay iframe on mobile is
    // strictly worse than the real page.
    if (mode === 'link' || window.innerWidth < 640) window.open(url, '_blank', 'noopener');
    else openOverlay(url);
  }

  /* ── views ── */
  function renderButton(opts) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opts.label || 'Buy now';
    btn.setAttribute('style', [
      'display:inline-flex', 'align-items:center', 'gap:8px',
      'padding:12px 22px', 'border:0', 'border-radius:' + (SHAPES[opts.shape] || SHAPES.pill),
      'background:' + (opts.color || '#4F46E5'), 'color:' + inkOn(opts.color || '#4F46E5'), 'font-weight:600',
      'font-size:15px', 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.16)', 'line-height:1.2'
    ].join(';'));
    btn.addEventListener('click', function () { openUrl(opts.origin + '/buy/' + encodeURIComponent(opts.key), opts.mode); });
    return btn;
  }

  function renderFrame(opts) {
    var id = 'cn' + (++seq);
    var frame = document.createElement('iframe');
    frame.src = opts.origin + '/w/' + encodeURIComponent(opts.key) + q({
      view: opts.view, label: opts.label, color: opts.color, shape: opts.shape, fid: id
    });
    frame.title = 'ContractNest packages';
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('allowtransparency', 'true');
    frame.setAttribute('style', [
      'width:100%', 'max-width:' + (opts.view === 'catalog' ? '720px' : '420px'),
      'height:260px', 'border:0', 'background:transparent', 'display:block', 'overflow:hidden'
    ].join(';'));
    frames[id] = { frame: frame, mode: opts.mode };
    return frame;
  }

  // the frame tells us its height and asks us to open URLs (so the overlay
  // is on the host page, not trapped inside the small card iframe)
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || String(d.type || '').indexOf('cn:') !== 0) return;
    if (currentOrigin() && e.origin !== currentOrigin()) return;
    var entry = frames[d.fid];
    if (!entry) return;
    if (d.type === 'cn:size' && d.height > 0) entry.frame.style.height = Math.ceil(d.height) + 'px';
    if (d.type === 'cn:open' && typeof d.url === 'string' && d.url.indexOf(currentOrigin()) === 0) openUrl(d.url, entry.mode);
    if (d.type === 'cn:close' && entry.close) entry.close();
  });

  /* ── the VaNi bubble: one per page ── */
  function renderBubble(opts) {
    if (bubbleMounted) return null;
    bubbleMounted = true;
    var color = opts.color || '#ff6b2b';
    var id = 'cn' + (++seq);
    var wrap = document.createElement('div');
    wrap.setAttribute('style', ['position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147482000', 'display:flex', 'flex-direction:column', 'align-items:flex-end', 'gap:10px'].join(';'));
    var panel = document.createElement('div');
    panel.setAttribute('style', ['width:min(380px,calc(100vw - 36px))', 'height:min(560px,calc(100vh - 110px))', 'border-radius:16px', 'overflow:hidden',
      'box-shadow:0 20px 60px rgba(0,0,0,0.28)', 'background:#fff', 'display:none'].join(';'));
    var frame = document.createElement('iframe');
    frame.title = 'Ask VaNi';
    frame.setAttribute('style', 'width:100%;height:100%;border:0;display:block');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Ask VaNi');
    btn.innerHTML = '<span style="font-weight:800;font-size:20px;line-height:1">V</span>';
    btn.setAttribute('style', ['width:56px', 'height:56px', 'border-radius:50%', 'border:0', 'background:' + color, 'color:' + inkOn(color),
      'cursor:pointer', 'box-shadow:0 8px 24px rgba(0,0,0,0.22)', 'font-family:system-ui,-apple-system,sans-serif', 'display:grid', 'place-items:center'].join(';'));
    var isOpen = false;
    function setOpen(v) {
      isOpen = v;
      if (v && !frame.src) frame.src = opts.origin + '/vani-chat/' + encodeURIComponent(opts.key) + q({ page: location.href, fid: id });
      panel.style.display = v ? 'block' : 'none';
      btn.innerHTML = v ? '<span style="font-size:22px;line-height:1">×</span>' : '<span style="font-weight:800;font-size:20px;line-height:1">V</span>';
    }
    btn.addEventListener('click', function () { setOpen(!isOpen); });
    frames[id] = { frame: frame, mode: 'overlay', close: function () { setOpen(false); } };
    panel.appendChild(frame);
    wrap.appendChild(panel);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    return wrap;
  }

  function optsFrom(el, extra) {
    var get = function (name, fallback) {
      var v = extra && extra[name] != null ? extra[name] : (el ? el.getAttribute('data-' + name) : null);
      return v == null || v === '' ? fallback : String(v);
    };
    var vani = get('vani', '');
    var view = get('view', vani ? 'bubble' : 'button');
    if (!VIEWS[view]) view = 'button';
    return {
      key: vani || get('storefront', ''), origin: currentOrigin(), view: view,
      label: get('label', ''), color: get('color', ''), shape: get('shape', ''),
      mode: get('mode', 'overlay')
    };
  }

  function mountInto(container, before, opts) {
    if (!opts.key || !opts.origin) return null;
    if (opts.view === 'bubble') return renderBubble(opts);
    var node = opts.view === 'button' ? renderButton(opts) : renderFrame(opts);
    if (before && before.parentNode) before.parentNode.insertBefore(node, before.nextSibling);
    else container.appendChild(node);
    return node;
  }

  function mountScript(script) {
    if (script[PROCESSED]) return;
    script[PROCESSED] = true;
    ORIGIN = originOf(script) || ORIGIN;
    mountInto(null, script, optsFrom(script));
  }

  function scan() {
    var scripts = document.querySelectorAll('script[data-storefront],script[data-vani]');
    for (var i = 0; i < scripts.length; i++) mountScript(scripts[i]);
  }

  /* ── the two developer calls ── */
  window.ContractNest = window.ContractNest || {};
  window.ContractNest.open = function (key, options) {
    var o = optsFrom(null, { storefront: key, mode: options && options.mode });
    if (o.key && o.origin) openUrl(o.origin + '/buy/' + encodeURIComponent(o.key), o.mode);
  };
  window.ContractNest.mount = function (el, options) {
    if (!el || !options || !(options.storefront || options.vani)) return null;
    return mountInto(el, null, optsFrom(null, options));
  };
  window.ContractNest.vani = function (siteKey, options) {
    var o = optsFrom(null, { vani: siteKey, view: 'bubble', color: options && options.color });
    if (o.key && o.origin) renderBubble(o);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();

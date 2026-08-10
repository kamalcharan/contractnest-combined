/* ============================================================================
 * ContractNest Extend — website embed (v1)
 * ============================================================================
 * Framework-proof by design: one script tag + an iframe. Works in plain HTML,
 * React, Angular, WordPress, server-rendered pages — anything that outputs
 * HTML. Payment and identity stay on the ContractNest origin, never the
 * host page.
 *
 *   <script src="https://<app-host>/embed.js" data-storefront="sf-…" async></script>
 *
 * Optional attributes:
 *   data-label="Get the AMC"   button text (default "Buy now")
 *   data-mode="link"           open /buy in a new tab instead of the overlay
 *   data-color="#4F46E5"       button color
 * ========================================================================== */
(function () {
  'use strict';

  var processed = 'cnExtendProcessed';

  function originOf(script) {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  }

  function openOverlay(buyUrl) {
    var overlay = document.createElement('div');
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'background:rgba(2,6,23,0.72)', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:16px'
    ].join(';'));

    var frame = document.createElement('iframe');
    frame.src = buyUrl;
    frame.setAttribute('style', [
      'width:100%', 'max-width:560px', 'height:min(720px,92vh)',
      'border:0', 'border-radius:16px', 'background:#0f172a',
      'box-shadow:0 24px 64px rgba(0,0,0,0.5)'
    ].join(';'));
    frame.setAttribute('allow', 'payment');

    var close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.setAttribute('style', [
      'position:absolute', 'top:14px', 'right:18px', 'width:36px', 'height:36px',
      'border:0', 'border-radius:50%', 'background:rgba(255,255,255,0.12)',
      'color:#fff', 'font-size:22px', 'line-height:36px', 'cursor:pointer'
    ].join(';'));

    function dismiss() { document.body.removeChild(overlay); }
    close.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });

    overlay.appendChild(frame);
    overlay.appendChild(close);
    document.body.appendChild(overlay);
  }

  function mount(script) {
    if (script[processed]) return;
    script[processed] = true;

    var key = script.getAttribute('data-storefront');
    var origin = originOf(script);
    if (!key || !origin) return;

    var buyUrl = origin + '/buy/' + encodeURIComponent(key);
    var label = script.getAttribute('data-label') || 'Buy now';
    var color = script.getAttribute('data-color') || '#4F46E5';
    var mode = script.getAttribute('data-mode') || 'overlay';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('style', [
      'display:inline-flex', 'align-items:center', 'gap:8px',
      'padding:12px 22px', 'border:0', 'border-radius:12px',
      'background:' + color, 'color:#fff', 'font-weight:600',
      'font-size:15px', 'font-family:system-ui,-apple-system,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.18)'
    ].join(';'));
    btn.addEventListener('click', function () {
      // Small screens get the full tab — an overlay iframe on mobile is
      // strictly worse than the real page.
      if (mode === 'link' || window.innerWidth < 640) {
        window.open(buyUrl, '_blank', 'noopener');
      } else {
        openOverlay(buyUrl);
      }
    });

    script.parentNode.insertBefore(btn, script.nextSibling);
  }

  function scan() {
    var scripts = document.querySelectorAll('script[data-storefront]');
    for (var i = 0; i < scripts.length; i++) mount(scripts[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();

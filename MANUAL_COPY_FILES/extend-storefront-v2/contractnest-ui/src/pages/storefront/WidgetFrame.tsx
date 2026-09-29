// ============================================================================
// WidgetFrame — /w/:storefrontKey — what embed.js puts in the iframe
// ============================================================================
// Renders the storefront's package card(s) with the storefront's card style,
// overridable from the query string (the configurator preview and the embed
// attributes both use it: ?view=card&label=…&color=…&shape=…). Transparent
// body so the card sits on the host page. Talks to embed.js by postMessage:
//   cn:size {height}   keep the iframe as tall as the content
//   cn:open {url}      open the checkout / package page on the HOST page
// Standalone (no parent), a click just navigates.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import PackageCard from './PackageCard';
import { storefrontApi, mergeCardStyle, storefrontUrls, StorefrontPublic, StorefrontPackage } from './api';

const WidgetFrame: React.FC = () => {
  const { storefrontKey = '' } = useParams<{ storefrontKey: string }>();
  const [params] = useSearchParams();
  const [data, setData] = useState<StorefrontPublic | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fid = params.get('fid') || '';
  const preview = params.get('preview') === '1';

  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    let on = true;
    storefrontApi.resolve(storefrontKey, true)
      .then((d) => { if (on) setData(d); })
      .catch(() => { if (on) setFailed(true); });
    return () => { on = false; };
  }, [storefrontKey]);

  const style = useMemo(() => mergeCardStyle(data?.card_style, {
    view: params.get('view'), label: params.get('label'), color: params.get('color'), shape: params.get('shape'),
  }), [data, params]);

  // report our height whenever it changes
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !window.parent || window.parent === window) return;
    const send = () => window.parent.postMessage({ type: 'cn:size', fid, height: el.getBoundingClientRect().height + 2 }, '*');
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fid, data, style]);

  const urls = storefrontUrls(storefrontKey);
  const open = (url: string) => {
    if (preview) return;
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'cn:open', fid, url }, '*');
    else window.location.assign(url);
  };
  const buy = (p: StorefrontPackage) => open(`${urls.buy}?pkg=${p.family_id}`);
  const explore = (p: StorefrontPackage) => open(`${urls.page}?pkg=${p.family_id}`);

  if (failed) return <div ref={rootRef} style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#8a847a', padding: 8 }}>This offer is not available right now.</div>;
  if (!data) return <div ref={rootRef} style={{ height: 120 }} />;

  const packages = style.view === 'catalog' ? data.packages : data.packages.slice(0, 1);
  return (
    <div ref={rootRef} style={{ display: 'grid', gap: 10, padding: 2 }}>
      {packages.map((p) => (
        <PackageCard key={p.family_id} pkg={p} style={style} onBuy={buy} onExplore={explore} compact={style.view === 'catalog'} />
      ))}
    </div>
  );
};

export default WidgetFrame;

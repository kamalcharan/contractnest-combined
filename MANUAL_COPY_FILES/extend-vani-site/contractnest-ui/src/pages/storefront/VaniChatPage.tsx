// ============================================================================
// VaniChatPage — /vani-chat/:key — what embed.js opens in the bubble panel
// ============================================================================
// key = the tenant's site key (vn-…) from data-vani, or a storefront key
// (sf-…) when a storefront widget uses the "Ask VaNi bubble" view. Full-height
// chat, transparent chrome; Buy / Explore ask the host page to open the
// checkout (cn:open), the same protocol as the widget frame.

import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import VaniChat from './VaniChat';

const VaniChatPage: React.FC = () => {
  const { key = '' } = useParams<{ key: string }>();
  const [params] = useSearchParams();
  const fid = params.get('fid') || '';
  const embedded = !!window.parent && window.parent !== window;

  useEffect(() => {
    document.body.style.background = '#fff';
    document.documentElement.style.height = '100%'; document.body.style.height = '100%'; document.body.style.margin = '0';
  }, []);

  const open = (url: string) => {
    if (embedded) window.parent.postMessage({ type: 'cn:open', fid, url }, '*');
    else window.open(url, '_blank', 'noopener');
  };
  const close = embedded ? () => window.parent.postMessage({ type: 'cn:close', fid }, '*') : undefined;

  return (
    <div style={{ height: '100vh', maxWidth: embedded ? undefined : 480, margin: embedded ? 0 : '0 auto' }}>
      <VaniChat siteKey={key} storefrontKey={params.get('storefront')} pageUrl={params.get('page')} compact={embedded} onOpen={open} onClose={close} />
    </div>
  );
};

export default VaniChatPage;

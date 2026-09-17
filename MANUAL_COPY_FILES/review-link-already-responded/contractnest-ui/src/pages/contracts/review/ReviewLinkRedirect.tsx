// src/pages/contracts/review/ReviewLinkRedirect.tsx
// A review link whose query string lost its '?' (a WhatsApp button template
// registered as ".../contract-review{{1}}" renders ".../contract-reviewcnak=…")
// lands on the SPA's catch-all as a 404. Normalise it onto /contract-review
// instead; anything else falls through to the real not-found page.
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BASE = '/contract-review';

export default function ReviewLinkRedirect({ fallback }: { fallback: React.ReactElement }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMangled = location.pathname.startsWith(BASE) && location.pathname !== BASE;

  useEffect(() => {
    if (!isMangled) return;
    const rest = (location.pathname.slice(BASE.length) + location.search).replace(/^[?/]+/, '');
    navigate(`${BASE}?${rest}`, { replace: true });
  }, [isMangled, location.pathname, location.search, navigate]);

  return isMangled ? null : fallback;
}

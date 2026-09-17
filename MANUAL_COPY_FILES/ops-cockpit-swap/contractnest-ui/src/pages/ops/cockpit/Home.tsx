// src/pages/ops/cockpit/Home.tsx
//
// /ops/cockpit — the landing page after login for every user, lite flavours
// included. Since 2026-09-17 (batch ops-cockpit-swap) the REVENUE side lands on
// the Ops board (Commitments: Collections + Services, one row model, tools with
// actors — specs/OPS-JTD-TOOLS-SPEC.md §5). The board is revenue-only by owner
// decision (To Pay stays its own page), so the EXPENSE side keeps the original
// cockpit (awaiting-acceptance, RFQ tracker) until To Pay covers it — at which
// point this file collapses to `export { default } from './Commitments'` and
// ./index.tsx is deleted.
//
// The perspective is the same AuthContext value both pages already read, so a
// perspective switch re-renders the right page in place.

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import OpsCockpitPage from './index';
import OpsCommitmentsPage from './Commitments';

const OpsHome: React.FC = () => {
  const { perspective } = useAuth() as { perspective?: 'revenue' | 'expense' };
  return perspective === 'expense' ? <OpsCockpitPage /> : <OpsCommitmentsPage />;
};

export default OpsHome;

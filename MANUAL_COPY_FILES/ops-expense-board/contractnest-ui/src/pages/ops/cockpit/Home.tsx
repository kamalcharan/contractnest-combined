// src/pages/ops/cockpit/Home.tsx
// /ops/cockpit renders the Ops board for BOTH perspectives since batch
// ops-expense-board (2026-09-17): revenue = collect · deliver, expense = pay ·
// receive · accept — one page, one card, one reader per side. The original
// cockpit (./index.tsx) is no longer routed; delete it once nothing else
// imports it.
import React from 'react';
import OpsCommitmentsPage from './Commitments';

const OpsHome: React.FC = () => <OpsCommitmentsPage />;

export default OpsHome;

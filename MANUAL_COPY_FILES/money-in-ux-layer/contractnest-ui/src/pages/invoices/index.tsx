// ============================================================================
// /invoices — retired as a standalone hub. Receivables and invoices merged
// into Money In (owner decision, 2026-08-13): one money workspace per side.
// The route survives so nothing 404s; the document pages (/invoices/new and
// /invoices/:id) remain real destinations reached from Money In.
// ============================================================================

import React from 'react';
import { Navigate } from 'react-router-dom';

const InvoicesRedirect: React.FC = () => <Navigate to="/money-in" replace />;

export default InvoicesRedirect;

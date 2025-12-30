// ============================================================
// ADD THESE IMPORTS TO src/App.tsx (after line ~132)
// ============================================================

// Contract Preview, PDF View, Ops Cockpit, Invite Sellers
import ContractPreviewPage from './pages/contracts/preview';
import PDFViewPage from './pages/contracts/pdf-view';
import OpsCockpitPage from './pages/ops/cockpit';
import InviteSellersPage from './pages/contracts/invite';

// ============================================================
// ADD THESE ROUTES TO src/App.tsx (inside the Routes section)
// Add after the existing /contracts/create route around line ~426
// ============================================================

{/* Contract Preview Route */}
<Route
  path="/contracts/preview"
  element={
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<ContractPreviewPage />} />
  <Route path=":id" element={<ContractPreviewPage />} />
</Route>

{/* PDF View Route */}
<Route
  path="/contracts/pdf"
  element={
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<PDFViewPage />} />
  <Route path=":id" element={<PDFViewPage />} />
</Route>

{/* Ops Cockpit Route */}
<Route
  path="/ops/cockpit"
  element={
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<OpsCockpitPage />} />
</Route>

{/* Invite Sellers Route */}
<Route
  path="/contracts/invite"
  element={
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<InviteSellersPage />} />
</Route>

// ═══════════════════════════════════════════════════════════════════
// PATCH: App.tsx — Add ContractsHub route
// ═══════════════════════════════════════════════════════════════════
//
// STEP 1: Add import at the top (after existing contract imports ~line 119)
//
//   import ContractsHubPage from './pages/contracts/hub';
//
// STEP 2: REPLACE the existing Service Contracts Routes block
//         (lines 369–393 in App.tsx) with this expanded block:

/*
  === FIND THIS (old) ===

          {/* Service Contracts Routes *\/}
          <Route
            path="/service-contracts"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="templates" replace />} />
            <Route path="contracts" element={<ContractsPage />} />
            ... templates routes ...
          </Route>

          {/* Legacy support for old routes *\/}
          <Route path="/contracts" element={<Navigate to="/service-contracts/contracts" replace />} />
          <Route path="/templates" element={<Navigate to="/service-contracts/templates" replace />} />


  === REPLACE WITH (new) ===

          {/* ═══ Contracts Hub (new unified entry) ═══ *\/}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ContractsHubPage />} />
            {/* Future: create & view routes added in next iteration *\/}
            {/* <Route path="create/:type" element={<ContractCreatePage />} /> *\/}
            {/* <Route path=":id" element={<ContractViewPage />} /> *\/}
          </Route>

          {/* Service Contracts Routes (templates + legacy contracts) *\/}
          <Route
            path="/service-contracts"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="templates" replace />} />
            <Route path="contracts" element={<ContractsPage />} />

            {/* Service Contracts - Templates Routes *\/}
            <Route path="templates">
              <Route index element={<MyTemplatesPage />} />
              <Route path="designer" element={<TemplateDesignerPage />} />
              <Route path="preview" element={<TemplatePreviewPage />} />
              {/* Admin routes *\/}
              <Route path="admin">
                <Route path="global-templates" element={<GlobalTemplatesPage />} />
                <Route path="global-designer" element={<div>Global Designer Coming Soon</div>} />
                <Route path="analytics" element={<div>Analytics Coming Soon</div>} />
              </Route>
            </Route>
          </Route>

          {/* Legacy redirect: /templates → service-contracts/templates *\/}
          <Route path="/templates" element={<Navigate to="/service-contracts/templates" replace />} />

*/

export {};

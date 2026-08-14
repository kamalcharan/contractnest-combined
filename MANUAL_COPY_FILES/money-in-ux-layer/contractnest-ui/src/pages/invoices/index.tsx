// ============================================================================
// /invoices — the invoice REGISTER (Part 2, 2026-08-14).
// ----------------------------------------------------------------------------
// This route briefly redirected to /money-in, when receivables and invoices
// were merged into one money surface. That merge still stands — Money In is
// the single nav entry per side and this page is NOT in the nav. It exists
// because a story-shaped screen cannot answer "where is INV-10059": Money In
// groups by buyer and shows the live picture, so settled and cancelled
// documents are correctly absent from it.
//
// The register is reached FROM Money In, and reads the same query.
// ============================================================================

export { default } from './register';

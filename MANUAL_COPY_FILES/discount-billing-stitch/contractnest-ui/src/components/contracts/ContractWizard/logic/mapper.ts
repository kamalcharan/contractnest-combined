// src/components/contracts/ContractWizard/logic/mapper.ts
// Wizard state → API payload assembly — extracted VERBATIM from index.tsx
// (Phase 1.5 logic extraction). No behavior change; guarded by logic/__parity__.
//
// ⚠ PARITY CONTRACT: computeEventsForApi feeds t_contracts.computed_events and
// must stay byte-identical to the backend port in
// contractnest-api/src/services/contractEventsDerivationService.ts — see
// contractnest-api/src/__tests__/contractEventsDerivationParity.ts.
import { computeContractEvents, type ContractEvent } from '@/utils/service-contracts/contractEvents';
import type { ContractWizardState, ContractType } from './state';

// Map wizard acceptance_method to API-accepted values
// API accepts: 'manual' | 'auto' | 'digital_signature'
export const ACCEPTANCE_METHOD_API_MAP: Record<string, string> = {
  payment: 'manual',
  signoff: 'digital_signature',
  auto: 'auto',
};

// UUID check for fly-by block detection
export const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Compute and format events for API (matches t_contracts.computed_events JSONB schema)
export function computeEventsForApi(state: ContractWizardState): any[] | undefined {
  // Skip for RFQ mode
  if (state.wizardMode === 'rfq') return undefined;

  // Compute events using the same logic as EventsPreviewStep
  const rawEvents = computeContractEvents({
    startDate: state.startDate,
    durationValue: state.durationValue,
    durationUnit: state.durationUnit,
    selectedBlocks: state.selectedBlocks,
    paymentMode: state.paymentMode,
    emiMonths: state.emiMonths,
    perBlockPaymentType: state.perBlockPaymentType,
    billingCycleType: state.billingCycleType,
    grandTotal: state.grandTotal || state.totalValue,
    currency: state.currency,
    baseSubtotal: state.baseSubtotal,
    discountTotal: state.discountTotal,
  });

  if (!rawEvents || rawEvents.length === 0) return undefined;

  // Apply eventOverrides and convert to API format
  const mapped = rawEvents.map((event: ContractEvent) => {
    // Apply user override if exists
    const overriddenDate = state.eventOverrides[event.id];
    const scheduledDate = overriddenDate || event.scheduled_date;

    return {
      block_id: event.block_id,
      block_name: event.block_name,
      category_id: event.category_id || undefined,
      event_type: event.event_type,
      billing_sub_type: event.billing_sub_type || undefined,
      billing_cycle_label: event.billing_cycle_label || undefined,
      sequence_number: event.sequence_number,
      total_occurrences: event.total_occurrences,
      scheduled_date: scheduledDate instanceof Date
        ? scheduledDate.toISOString()
        : new Date(scheduledDate).toISOString(),
      amount: event.amount || undefined,
      currency: event.currency || state.currency,
      assigned_to: event.assigned_to || undefined,
      assigned_to_name: event.assigned_to_name || undefined,
    };
  });
  // Re-sort by scheduled date so persisted order matches the (re-sorted) preview
  // after any user date overrides.
  mapped.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  return mapped;
}

// Map wizard state to API request payload (matches deployed DB RPC schema)
// Exported: the VaNi canvas finalize path uses the SAME mapper (single write path)
export function mapWizardToRequest(
  state: ContractWizardState,
  contractType: ContractType
): Record<string, any> {
  // Map acceptance method to API-compatible value
  const apiAcceptanceMethod = state.acceptanceMethod
    ? ACCEPTANCE_METHOD_API_MAP[state.acceptanceMethod] || state.acceptanceMethod
    : undefined;

  // Compute events for contract (not RFQ)
  const computedEvents = computeEventsForApi(state);

  // Build blocks array — flattened to match t_contract_blocks columns
  const blocks = state.selectedBlocks.map((block, idx) => {
    const isFlyBy = !isValidUUID(block.id);
    return {
      position: idx,
      source_type: isFlyBy ? 'flyby' : 'catalog',
      source_block_id: isFlyBy ? undefined : block.id,
      block_name: block.name,
      block_description: block.description || '',
      category_id: block.categoryId || undefined,
      category_name: block.categoryName,
      unit_price: block.price,
      quantity: block.quantity,
      billing_cycle: block.cycle,
      total_price: block.totalPrice,
      flyby_type: isFlyBy ? (block.flyByType || 'text') : undefined,
      custom_fields: {
        currency: block.currency,
        unlimited: block.unlimited,
        config: block.config || {},
        originalId: isFlyBy ? block.id : undefined,
      },
    };
  });

  // Build vendors array (RFQ only) — matches t_contract_vendors columns
  const vendors = state.wizardMode === 'rfq'
    ? state.vendorIds.map((id, idx) => ({
        vendor_id: id,
        contact_id: id,
        contact_classification: 'vendor',
        vendor_name: state.vendorNames[idx] || '',
      }))
    : [];

  return {
    // Core fields
    record_type: state.wizardMode === 'rfq' ? 'rfq' : 'contract',
    // Note: contract_type omitted — API validates against pricing types
    // (fixed_price, etc.) which the wizard doesn't set. The relationship
    // type (client/vendor/partner) is carried by contact_classification.
    name: state.contractName,
    title: state.contractName,
    description: state.description || undefined,
    acceptance_method: apiAcceptanceMethod,
    path: state.path,
    template_id: state.templateId || undefined,

    // Nomenclature (optional contract type classification)
    nomenclature_id: state.nomenclatureId || undefined,

    // Buyer / counterparty (contact_id + classification)
    buyer_id: state.buyerId || undefined,
    contact_id: state.buyerId || undefined,
    contact_classification: contractType,
    buyer_name: state.buyerName || undefined,
    buyer_contact_person_id: state.buyerContactPersonId || undefined,
    buyer_contact_person_name: state.buyerContactPersonName || undefined,

    // Duration & timeline
    start_date: state.startDate.toISOString(),
    duration_value: state.durationValue,
    duration_unit: state.durationUnit,
    grace_period_value: state.gracePeriodValue,
    grace_period_unit: state.gracePeriodUnit,

    // Billing
    currency: state.currency,
    billing_cycle_type: state.billingCycleType || undefined,
    payment_mode: state.paymentMode,
    emi_months: state.paymentMode === 'emi' ? state.emiMonths : undefined,
    per_block_payment_type: JSON.stringify(state.perBlockPaymentType),
    total_value: state.baseSubtotal || state.totalValue,
    tax_total: state.taxTotal,
    grand_total: state.grandTotal,
    selected_tax_rate_ids: state.selectedTaxRateIds,
    tax_breakdown: state.taxBreakdown,

    // Sprint 1: contract-level discount, applied before tax
    discount_type: state.discountType || undefined,
    discount_value: state.discountValue || undefined,
    discount_total: state.discountTotal || undefined,

    // Related entities
    blocks,
    vendors,

    // Evidence policy
    evidence_policy_type: state.evidencePolicyType,
    evidence_selected_forms: state.evidencePolicyType === 'smart_form'
      ? state.evidenceSelectedForms.map((f) => ({
          form_template_id: f.form_template_id,
          name: f.name,
          version: f.version,
          category: f.category,
          sort_order: f.sort_order,
        }))
      : [],

    // Computed events (for PGMQ trigger when contract becomes active)
    computed_events: computedEvents,

    // Equipment / Entity details (JSONB — matches t_contracts.equipment_details)
    equipment_details: state.equipmentDetails.length > 0 ? state.equipmentDetails : undefined,
    allow_buyer_to_add_equipment: state.allowBuyerToAdd || undefined,
    coverage_types: state.coverageTypes.length > 0 ? state.coverageTypes : undefined,
  };
}

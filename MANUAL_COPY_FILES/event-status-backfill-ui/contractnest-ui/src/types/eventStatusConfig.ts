// src/types/eventStatusConfig.ts
// Event Status Configuration Type Definitions
// Used by: settings page, timeline components, status dropdowns

// =================================================================
// STATUS DEFINITIONS
// =================================================================

export interface EventStatusDefinition {
  id: string;
  status_code: string;
  display_name: string;
  description: string | null;
  hex_color: string;
  icon_name: string | null;
  display_order: number;
  is_initial: boolean;
  is_terminal: boolean;
  source: 'system' | 'tenant' | 'vani';
}

export interface EventStatusTransition {
  id: string;
  from_status: string;
  to_status: string;
  requires_reason: boolean;
  requires_evidence: boolean;
}

// =================================================================
// API RESPONSE TYPES
// =================================================================

export interface GetStatusesResponse {
  success: boolean;
  event_type: string;
  is_tenant_override: boolean;
  statuses: EventStatusDefinition[];
}

export interface GetTransitionsResponse {
  success: boolean;
  event_type: string;
  is_tenant_override: boolean;
  transitions: EventStatusTransition[];
}

export interface SeedDefaultsResponse {
  success: boolean;
  tenant_id: string;
  statuses_seeded: number;
  transitions_seeded: number;
}

export interface UpsertResponse {
  success: boolean;
  id: string;
}

export interface DeleteResponse {
  success: boolean;
  deactivated_transitions?: number;
}

// =================================================================
// REQUEST TYPES
// =================================================================

export interface UpsertStatusRequest {
  event_type: string;
  status_code: string;
  display_name: string;
  description?: string;
  hex_color?: string;
  icon_name?: string;
  display_order?: number;
  is_initial?: boolean;
  is_terminal?: boolean;
}

export interface DeleteStatusRequest {
  event_type: string;
  status_code: string;
}

export interface UpsertTransitionRequest {
  event_type: string;
  from_status: string;
  to_status: string;
  requires_reason?: boolean;
  requires_evidence?: boolean;
}

export interface DeleteTransitionRequest {
  id: string;
}

// =================================================================
// FILTER TYPES
// =================================================================

export interface StatusConfigFilters {
  event_type: string;
}

export interface TransitionFilters {
  event_type: string;
  from_status?: string;
}

// =================================================================
// DERIVED HELPERS (for UI consumption)
// =================================================================

/** Map of status_code -> EventStatusDefinition for quick lookups */
export type StatusMap = Record<string, EventStatusDefinition>;

/** Map of from_status -> allowed to_status[] for transition validation */
export type TransitionMap = Record<string, string[]>;

/** Build a StatusMap from an array of status definitions */
export const buildStatusMap = (statuses: EventStatusDefinition[]): StatusMap => {
  const map: StatusMap = {};
  for (const s of statuses) {
    map[s.status_code] = s;
  }
  return map;
};

/** Build a TransitionMap from an array of transitions */
export const buildTransitionMap = (transitions: EventStatusTransition[]): TransitionMap => {
  const map: TransitionMap = {};
  for (const t of transitions) {
    if (!map[t.from_status]) map[t.from_status] = [];
    map[t.from_status].push(t.to_status);
  }
  return map;
};

/** Get allowed next statuses for a given current status */
export const getAllowedTransitions = (
  currentStatus: string,
  transitions: EventStatusTransition[]
): string[] => {
  return transitions
    .filter(t => t.from_status === currentStatus)
    .map(t => t.to_status);
};

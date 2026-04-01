// src/pages/service-contracts/templates/admin/knowledge-tree/types.ts
// TypeScript interfaces for Knowledge Tree data model

export interface KnowledgeTreeVariant {
  id: string;
  resource_template_id: string;
  name: string;
  description: string | null;
  capacity_range: string | null;
  attributes: Record<string, unknown>;
  sort_order: number;
  source: 'ai_researched' | 'user_contributed';
}

export interface KnowledgeTreeSparePart {
  id: string;
  resource_template_id: string;
  component_group: string;
  name: string;
  description: string | null;
  specifications: Record<string, unknown>;
  sort_order: number;
  source: 'ai_researched' | 'user_contributed';
  variant_applicability: SparePartVariantMap[];
}

export interface SparePartVariantMap {
  id: string;
  spare_part_id: string;
  variant_id: string;
  is_recommended: boolean;
  notes: string | null;
}

export interface CheckpointValue {
  id: string;
  checkpoint_id: string;
  label: string;
  severity: 'ok' | 'attention' | 'critical';
  triggers_part_consumption: boolean;
  requires_photo: boolean;
  sort_order: number;
}

export interface CheckpointVariantMap {
  id: string;
  checkpoint_id: string;
  variant_id: string;
  override_min: number | null;
  override_max: number | null;
  override_amber: number | null;
  override_red: number | null;
}

export interface KnowledgeTreeCheckpoint {
  id: string;
  resource_template_id: string;
  checkpoint_type: 'condition' | 'reading';
  service_activity: 'pm' | 'repair' | 'inspection' | 'install' | 'decommission';
  section_name: string;
  name: string;
  description: string | null;
  layer: 'base' | 'equipment';
  unit: string | null;
  normal_min: number | null;
  normal_max: number | null;
  amber_threshold: number | null;
  red_threshold: number | null;
  threshold_note: string | null;
  source: 'ai_researched' | 'user_contributed';
  sort_order: number;
  values: CheckpointValue[];
  variant_applicability: CheckpointVariantMap[];
}

export interface KnowledgeTreeCycle {
  id: string;
  checkpoint_id: string;
  frequency_value: number;
  frequency_unit: 'days' | 'hours' | 'visits';
  varies_by: string[];
  alert_overdue_days: number | null;
  source: 'ai_researched' | 'user_contributed';
  checkpoint_name?: string;
  section_name?: string;
  service_activity?: string;
}

export interface KnowledgeTreeOverlay {
  id: string;
  resource_template_id: string;
  context_type: 'climate' | 'geography' | 'industry' | 'industry_served';
  context_value: string;
  adjustments: Record<string, unknown>;
  priority: number;
}

// Coverage: lightweight check for which resource templates have KT data
export interface KnowledgeTreeCoverageItem {
  resource_template_id: string;
  variants_count: number;
  spare_parts_count: number;
  checkpoints_count: number;
}

export type KnowledgeTreeCoverageMap = Record<string, KnowledgeTreeCoverageItem>;

// Full summary response from GET /knowledge-tree/summary
export interface KnowledgeTreeSummary {
  resource_template: {
    id: string;
    name: string;
    description: string | null;
    sub_category: string;
    scope: string;
  };
  summary: {
    variants_count: number;
    spare_parts_count: number;
    component_groups: string[];
    checkpoints_count: number;
    sections: string[];
    service_activities: string[];
    cycles_count: number;
    overlays_count: number;
    variant_part_mappings: number;
    variant_checkpoint_mappings: number;
  };
  variants: KnowledgeTreeVariant[];
  spare_parts_by_group: Record<string, KnowledgeTreeSparePart[]>;
  checkpoints_by_section: Record<string, KnowledgeTreeCheckpoint[]>;
  cycles: KnowledgeTreeCycle[];
  overlays_by_type: Record<string, KnowledgeTreeOverlay[]>;
}

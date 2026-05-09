// src/controllers/knowledgeTreeController.ts
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { knowledgeTreeGeneratorService } from '../services/knowledgeTreeGeneratorService';
import { complianceTaggerService } from '../services/complianceTaggerService';
import { overlaysGeneratorService } from '../services/overlaysGeneratorService';

interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

// ── ID resolution helpers ─────────────────────────────────────────────────────

// Full KT: replaces all temp IDs with real UUIDs across all arrays
function resolveIds(payload: any): any {
  const variantMap: Record<string, string> = {};
  const sparePartMap: Record<string, string> = {};
  const checkpointMap: Record<string, string> = {};

  const variants = (payload.variants ?? []).map((v: any) => {
    const id = randomUUID();
    variantMap[v.id] = id;
    return { ...v, id };
  });

  const spare_parts = (payload.spare_parts ?? []).map((sp: any) => {
    const id = randomUUID();
    sparePartMap[sp.id] = id;
    return { ...sp, id };
  });

  const spare_part_variant_map = (payload.spare_part_variant_map ?? []).map((m: any) => ({
    ...m,
    id: randomUUID(),
    spare_part_id: sparePartMap[m.spare_part_id] ?? m.spare_part_id,
    variant_id: variantMap[m.variant_id] ?? m.variant_id,
  }));

  const checkpoints = (payload.checkpoints ?? []).map((cp: any) => {
    const id = randomUUID();
    checkpointMap[cp.id] = id;
    return { ...cp, id };
  });

  const checkpoint_values = (payload.checkpoint_values ?? []).map((cv: any) => ({
    ...cv,
    id: randomUUID(),
    checkpoint_id: checkpointMap[cv.checkpoint_id] ?? cv.checkpoint_id,
  }));

  const checkpoint_variant_map = (payload.checkpoint_variant_map ?? []).map((m: any) => ({
    ...m,
    id: randomUUID(),
    checkpoint_id: checkpointMap[m.checkpoint_id] ?? m.checkpoint_id,
    variant_id: variantMap[m.variant_id] ?? m.variant_id,
  }));

  const service_cycles = (payload.service_cycles ?? []).map((sc: any) => ({
    ...sc,
    id: randomUUID(),
    checkpoint_id: checkpointMap[sc.checkpoint_id] ?? sc.checkpoint_id,
  }));

  return {
    ...payload,
    variants,
    spare_parts,
    spare_part_variant_map,
    checkpoints,
    checkpoint_values,
    checkpoint_variant_map,
    service_cycles,
    context_overlays: [],
  };
}

// Step 1: variants only — temp IDs → real UUIDs
function resolveVariantIds(payload: any): any {
  const variants = (payload.variants ?? []).map((v: any) => ({ ...v, id: randomUUID() }));
  return { ...payload, variants };
}

// Step 2: spare parts — temp IDs → real UUIDs; variant_ids in svm are already real
function resolveSparePartIds(payload: any): any {
  const sparePartMap: Record<string, string> = {};

  const spare_parts = (payload.spare_parts ?? []).map((sp: any) => {
    const id = randomUUID();
    sparePartMap[sp.id] = id;
    return { ...sp, id };
  });

  const spare_part_variant_map = (payload.spare_part_variant_map ?? []).map((m: any) => ({
    ...m,
    id: randomUUID(),
    spare_part_id: sparePartMap[m.spare_part_id] ?? m.spare_part_id,
    // variant_id is already a real UUID supplied by the caller — no resolution needed
  }));

  return { ...payload, spare_parts, spare_part_variant_map };
}

// Step 3: checkpoints — temp IDs → real UUIDs; variant_ids in cvm are already real
function resolveCheckpointIds(payload: any): any {
  const checkpointMap: Record<string, string> = {};

  const checkpoints = (payload.checkpoints ?? []).map((cp: any) => {
    const id = randomUUID();
    checkpointMap[cp.id] = id;
    return { ...cp, id };
  });

  const checkpoint_values = (payload.checkpoint_values ?? []).map((cv: any) => ({
    ...cv,
    id: randomUUID(),
    checkpoint_id: checkpointMap[cv.checkpoint_id] ?? cv.checkpoint_id,
  }));

  const checkpoint_variant_map = (payload.checkpoint_variant_map ?? []).map((m: any) => ({
    ...m,
    id: randomUUID(),
    checkpoint_id: checkpointMap[m.checkpoint_id] ?? m.checkpoint_id,
    // variant_id is already a real UUID — no resolution needed
  }));

  const service_cycles = (payload.service_cycles ?? []).map((sc: any) => ({
    ...sc,
    id: randomUUID(),
    checkpoint_id: checkpointMap[sc.checkpoint_id] ?? sc.checkpoint_id,
  }));

  return { ...payload, checkpoints, checkpoint_values, checkpoint_variant_map, service_cycles };
}

// ── Controller ────────────────────────────────────────────────────────────────

class KnowledgeTreeController {
  private getContext(req: AuthRequest) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers.authorization;
    if (!tenantId || !authHeader) return null;
    return { tenantId, accessToken: authHeader.replace('Bearer ', '') };
  }

  // POST /api/knowledge-tree/generate (legacy full single-prompt — used for + Install / + Decomm)
  generate = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId, serviceActivity, existingKT } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, and resourceTemplateId are required' } });
      return;
    }

    try {
      const raw = await knowledgeTreeGeneratorService.generate({ equipmentName, subCategory, resourceTemplateId, serviceActivity: serviceActivity || 'pm', existingKT: !!existingKT });
      const payload = resolveIds(raw);
      payload.resource_template_id = resourceTemplateId;

      if (existingKT) {
        const missing: string[] = [];
        if (!payload.checkpoints?.length) missing.push('checkpoints');
        if (!payload.service_cycles?.length) missing.push('service_cycles');
        if (missing.length > 0) throw new Error(`Incomplete generation — missing: ${missing.join(', ')}. Please retry.`);

        const activityPayload = { resource_template_id: resourceTemplateId, service_activity: serviceActivity || 'pm', checkpoints: payload.checkpoints, checkpoint_values: payload.checkpoint_values, service_cycles: payload.service_cycles };
        console.log(`✅ Activity KT ready (${activityPayload.service_activity}) — checkpoints: ${activityPayload.checkpoints.length}, service_cycles: ${activityPayload.service_cycles.length}`);
        res.status(200).json({ success: true, data: activityPayload });
      } else {
        const missing: string[] = [];
        if (!payload.variants?.length) missing.push('variants');
        if (!payload.checkpoints?.length) missing.push('checkpoints');
        if (!payload.service_cycles?.length) missing.push('service_cycles');
        if (missing.length > 0) throw new Error(`Incomplete generation — missing: ${missing.join(', ')}. Please retry.`);

        console.log(`✅ KT ready — variants: ${payload.variants.length}, spare_parts: ${payload.spare_parts?.length ?? 0}, spare_part_variant_map: ${payload.spare_part_variant_map?.length ?? 0}, checkpoints: ${payload.checkpoints.length}, service_cycles: ${payload.service_cycles.length}`);
        res.status(200).json({ success: true, data: payload });
      }
    } catch (error: any) {
      console.error('❌ KT generate error:', error.message);
      res.status(500).json({ success: false, error: { code: 'GENERATE_FAILED', message: error.message || 'Failed to generate Knowledge Tree' } });
    }
  };

  // POST /api/knowledge-tree/generate-variants — Step 1
  generateVariants = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, and resourceTemplateId are required' } });
      return;
    }

    try {
      const raw = await knowledgeTreeGeneratorService.generateVariants({ equipmentName, subCategory, resourceTemplateId });
      if (!raw.variants?.length) throw new Error('No variants returned. Please retry.');

      const payload = resolveVariantIds(raw);
      payload.resource_template_id = resourceTemplateId;

      console.log(`✅ Step 1 — Variants ready: ${payload.variants.length} for "${equipmentName}"`);
      res.status(200).json({ success: true, step: 1, data: payload });
    } catch (error: any) {
      console.error('❌ Step 1 (variants) error:', error.message);
      res.status(500).json({ success: false, step: 1, error: { code: 'GENERATE_VARIANTS_FAILED', message: error.message || 'Failed to generate variants' } });
    }
  };

  // POST /api/knowledge-tree/generate-spare-parts — Step 2
  generateSpareParts = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId, variants } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, and resourceTemplateId are required' } });
      return;
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'variants[] is required. Generate variants (Step 1) first.' } });
      return;
    }

    try {
      const raw = await knowledgeTreeGeneratorService.generateSpareParts({ equipmentName, subCategory, resourceTemplateId, variants });
      if (!raw.spare_parts?.length) throw new Error('No spare parts returned. Please retry.');

      const payload = resolveSparePartIds(raw);
      payload.resource_template_id = resourceTemplateId;

      console.log(`✅ Step 2 — Spare parts ready: ${payload.spare_parts.length} parts, ${payload.spare_part_variant_map?.length ?? 0} variant mappings for "${equipmentName}"`);
      res.status(200).json({ success: true, step: 2, data: payload });
    } catch (error: any) {
      console.error('❌ Step 2 (spare parts) error:', error.message);
      res.status(500).json({ success: false, step: 2, error: { code: 'GENERATE_SPARE_PARTS_FAILED', message: error.message || 'Failed to generate spare parts' } });
    }
  };

  // POST /api/knowledge-tree/generate-checkpoints — Step 3
  generateCheckpoints = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId, serviceActivity, variants } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, and resourceTemplateId are required' } });
      return;
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'variants[] is required. Generate variants (Step 1) first.' } });
      return;
    }

    try {
      const activity = serviceActivity || 'pm';
      const raw = await knowledgeTreeGeneratorService.generateCheckpoints({ equipmentName, subCategory, resourceTemplateId, serviceActivity: activity, variants });

      const missing: string[] = [];
      if (!raw.checkpoints?.length) missing.push('checkpoints');
      if (!raw.service_cycles?.length) missing.push('service_cycles');
      if (missing.length > 0) throw new Error(`Incomplete generation — missing: ${missing.join(', ')}. Please retry.`);

      const payload = resolveCheckpointIds(raw);
      payload.resource_template_id = resourceTemplateId;
      payload.service_activity = activity;

      console.log(`✅ Step 3 — Checkpoints ready: ${payload.checkpoints.length} checkpoints, ${payload.service_cycles.length} cycles for "${equipmentName}" (${activity})`);
      res.status(200).json({ success: true, step: 3, data: payload });
    } catch (error: any) {
      console.error('❌ Step 3 (checkpoints) error:', error.message);
      res.status(500).json({ success: false, step: 3, error: { code: 'GENERATE_CHECKPOINTS_FAILED', message: error.message || 'Failed to generate checkpoints' } });
    }
  };

  // POST /api/knowledge-tree/tag-compliance
  tagCompliance = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId, checkpoints } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId || !Array.isArray(checkpoints) || checkpoints.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, resourceTemplateId, and checkpoints[] are required' } });
      return;
    }

    try {
      const tags = await complianceTaggerService.tag({ equipmentName, subCategory, checkpoints });
      res.status(200).json({ success: true, data: { resource_template_id: resourceTemplateId, tags } });
    } catch (error: any) {
      console.error('❌ Tag compliance error:', error.message);
      res.status(500).json({ success: false, error: { code: 'TAG_COMPLIANCE_FAILED', message: error.message || 'Failed to tag compliance standards' } });
    }
  };

  // POST /api/knowledge-tree/generate-overlays
  generateOverlays = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' } });
      return;
    }

    const { equipmentName, subCategory, resourceTemplateId } = req.body;
    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'equipmentName, subCategory, and resourceTemplateId are required' } });
      return;
    }

    try {
      const rawOverlays = await overlaysGeneratorService.generate({ equipmentName, subCategory, resourceTemplateId });
      const context_overlays = rawOverlays.map((co: any) => ({ ...co, id: randomUUID() }));

      console.log(`✅ Overlays ready — ${context_overlays.length} overlays for "${equipmentName}"`);
      res.status(200).json({ success: true, data: { resource_template_id: resourceTemplateId, context_overlays } });
    } catch (error: any) {
      console.error('❌ Overlays generate error:', error.message);
      res.status(500).json({ success: false, error: { code: 'GENERATE_OVERLAYS_FAILED', message: error.message || 'Failed to generate context overlays' } });
    }
  };
}

export const knowledgeTreeController = new KnowledgeTreeController();

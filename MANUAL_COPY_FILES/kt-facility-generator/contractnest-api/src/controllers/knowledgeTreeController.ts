// src/controllers/knowledgeTreeController.ts
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { knowledgeTreeGeneratorService } from '../services/knowledgeTreeGeneratorService';

interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

// Replace LLM-generated short IDs (v1, sp1, cp1 …) with real UUIDs,
// keeping all cross-references consistent across mapping tables.
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

  const checkpoints = (payload.checkpoints ?? []).map((cp: any) => {
    const id = randomUUID();
    checkpointMap[cp.id] = id;
    return { ...cp, id };
  });

  const spare_part_variant_map = (payload.spare_part_variant_map ?? []).map((m: any) => ({
    ...m,
    id: randomUUID(),
    spare_part_id: sparePartMap[m.spare_part_id] ?? m.spare_part_id,
    variant_id: variantMap[m.variant_id] ?? m.variant_id,
  }));

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

  const context_overlays = (payload.context_overlays ?? []).map((co: any) => ({
    ...co,
    id: randomUUID(),
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
    context_overlays,
  };
}

// Builds a human-readable error for incomplete generation.
// Distinguishes between truncation (output too long) and genuine LLM omission.
function buildIncompleteError(missing: string[], truncated: boolean): string {
  const fieldList = missing.join(', ');
  if (truncated) {
    return (
      `Generation was cut off before completing (missing: ${fieldList}). ` +
      `This happens when the output is very detailed — please retry once. It usually succeeds on the second attempt.`
    );
  }
  return `Incomplete generation — missing: ${fieldList}. Please retry.`;
}

class KnowledgeTreeController {
  private getContext(req: AuthRequest) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers.authorization;
    if (!tenantId || !authHeader) return null;
    return {
      tenantId,
      accessToken: authHeader.replace('Bearer ', ''),
    };
  }

  generate = async (req: AuthRequest, res: Response): Promise<void> => {
    const context = this.getContext(req);
    if (!context) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' },
      });
      return;
    }

    const {
      equipmentName,
      subCategory,
      resourceTemplateId,
      serviceActivity,
      existingKT,
      resourceType = 'equipment', // 'equipment' | 'facility' — defaults to equipment for backwards compat
    } = req.body;

    if (!equipmentName || !subCategory || !resourceTemplateId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'equipmentName, subCategory, and resourceTemplateId are required',
        },
      });
      return;
    }

    try {
      const { data: raw, truncated } = await knowledgeTreeGeneratorService.generate({
        equipmentName,
        subCategory,
        resourceTemplateId,
        serviceActivity: serviceActivity || 'pm',
        existingKT: !!existingKT,
        resourceType,
      });

      const payload = resolveIds(raw);
      payload.resource_template_id = resourceTemplateId;

      if (existingKT) {
        // Activity-only: variants/parts already in DB — send only checkpoints + cycles
        const missing: string[] = [];
        if (!payload.checkpoints?.length) missing.push('checkpoints');
        if (!payload.service_cycles?.length) missing.push('service_cycles');
        if (missing.length > 0) {
          throw new Error(buildIncompleteError(missing, truncated));
        }

        const activityPayload = {
          resource_template_id: resourceTemplateId,
          service_activity: serviceActivity || 'pm',
          checkpoints: payload.checkpoints,
          checkpoint_values: payload.checkpoint_values,
          service_cycles: payload.service_cycles,
        };

        console.log(
          `✅ Activity KT ready (${activityPayload.service_activity}) — ` +
          `checkpoints: ${activityPayload.checkpoints.length}, ` +
          `service_cycles: ${activityPayload.service_cycles.length}`
        );
        res.status(200).json({ success: true, data: activityPayload });

      } else if (resourceType === 'facility') {
        // Facility full KT — zones (variants) + checkpoints + service_cycles required.
        // spare_parts (consumables) are optional — a facility can have zero consumables
        // if the LLM determines none are needed (e.g. a simple parking space).
        const missing: string[] = [];
        if (!payload.variants?.length) missing.push('zones');
        if (!payload.checkpoints?.length) missing.push('checkpoints');
        if (!payload.service_cycles?.length) missing.push('service_cycles');
        if (missing.length > 0) {
          throw new Error(buildIncompleteError(missing, truncated));
        }

        console.log(
          `✅ Facility KT ready — zones: ${payload.variants.length}, ` +
          `consumables: ${payload.spare_parts?.length ?? 0}, ` +
          `checkpoints: ${payload.checkpoints.length}, ` +
          `service_cycles: ${payload.service_cycles.length}, ` +
          `context_overlays: ${payload.context_overlays?.length ?? 0}` +
          `${truncated ? ' ⚠️ (truncated — partial output)' : ''}`
        );
        res.status(200).json({ success: true, data: payload });

      } else {
        // Equipment full KT — variants + checkpoints + service_cycles required
        const missing: string[] = [];
        if (!payload.variants?.length) missing.push('variants');
        if (!payload.checkpoints?.length) missing.push('checkpoints');
        if (!payload.service_cycles?.length) missing.push('service_cycles');
        if (missing.length > 0) {
          throw new Error(buildIncompleteError(missing, truncated));
        }

        console.log(
          `✅ Equipment KT ready — variants: ${payload.variants.length}, ` +
          `spare_parts: ${payload.spare_parts?.length ?? 0}, ` +
          `checkpoints: ${payload.checkpoints.length}, ` +
          `service_cycles: ${payload.service_cycles.length}, ` +
          `context_overlays: ${payload.context_overlays?.length ?? 0}` +
          `${truncated ? ' ⚠️ (truncated — partial output)' : ''}`
        );
        res.status(200).json({ success: true, data: payload });
      }

    } catch (error: any) {
      console.error('❌ KT generate error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_FAILED',
          message: error.message || 'Failed to generate Knowledge Tree',
        },
      });
    }
  };
}

export const knowledgeTreeController = new KnowledgeTreeController();

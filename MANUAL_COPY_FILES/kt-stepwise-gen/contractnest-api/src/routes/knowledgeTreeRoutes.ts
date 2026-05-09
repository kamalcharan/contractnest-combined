// src/routes/knowledgeTreeRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import { knowledgeTreeController } from '../controllers/knowledgeTreeController';

const router = express.Router();

const validateHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const tenantId = req.headers['x-tenant-id'];
  if (!authHeader || !tenantId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization or x-tenant-id header' },
    });
    return;
  }
  next();
};

// Legacy full single-prompt generation (used for + Install / + Decomm activity mode)
// POST /api/knowledge-tree/generate
router.post('/generate', validateHeaders, knowledgeTreeController.generate);

// POST /api/knowledge-tree/tag-compliance
router.post('/tag-compliance', validateHeaders, knowledgeTreeController.tagCompliance);

// POST /api/knowledge-tree/generate-overlays
router.post('/generate-overlays', validateHeaders, knowledgeTreeController.generateOverlays);

// ── Stepwise generation (3 independent steps) ─────────────────────────────────

// Step 1 — Variants only
// Body: { equipmentName, subCategory, resourceTemplateId }
// Returns: { success, step: 1, data: { resource_template_id, variants: [...] } }
router.post('/generate-variants', validateHeaders, knowledgeTreeController.generateVariants);

// Step 2 — Spare parts + variant mappings
// Body: { equipmentName, subCategory, resourceTemplateId, variants: [{id, name, capacity_range}] }
// Returns: { success, step: 2, data: { resource_template_id, spare_parts: [...], spare_part_variant_map: [...] } }
router.post('/generate-spare-parts', validateHeaders, knowledgeTreeController.generateSpareParts);

// Step 3 — Checkpoints + values + variant overrides + service cycles
// Body: { equipmentName, subCategory, resourceTemplateId, serviceActivity, variants: [{id, name, capacity_range}] }
// Returns: { success, step: 3, data: { resource_template_id, checkpoints: [...], checkpoint_values: [...], checkpoint_variant_map: [...], service_cycles: [...] } }
router.post('/generate-checkpoints', validateHeaders, knowledgeTreeController.generateCheckpoints);

export default router;

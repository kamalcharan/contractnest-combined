// src/controllers/knowledgeTreeController.ts
import { Request, Response } from 'express';
import { knowledgeTreeGeneratorService } from '../services/knowledgeTreeGeneratorService';

interface AuthRequest extends Request {
  user?: { id: string; email?: string };
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

    const { equipmentName, subCategory, resourceTemplateId, serviceActivity } = req.body;

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
      const payload = await knowledgeTreeGeneratorService.generate({
        equipmentName,
        subCategory,
        resourceTemplateId,
        serviceActivity: serviceActivity || 'pm',
      });

      res.status(200).json({ success: true, data: payload });
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

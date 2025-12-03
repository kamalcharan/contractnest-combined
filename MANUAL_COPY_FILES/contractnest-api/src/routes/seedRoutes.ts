// src/routes/seedRoutes.ts
// API routes for Tenant Seed functionality
// Provides endpoints for seeding default data during onboarding

import express from 'express';
import { Request, Response } from 'express';
import axios from 'axios';
import {
  SeedRegistry,
  getAllSeedCategories,
  getRequiredSeedCategories,
  getSeedPreview,
  getAllSeedPreviews,
  getSeedData,
  sortSeedsByDependencies,
  SEQUENCE_SEED_DATA,
  generateSequencePreview
} from '../seeds';
import { SeedResult, TenantSeedResult } from '../seeds/types';

const router = express.Router();

// =================================================================
// Helper: Build headers for edge function calls
// =================================================================
const buildHeaders = (req: Request) => {
  const authHeader = req.headers.authorization;
  const tenantId = req.headers['x-tenant-id'] as string;
  const environment = req.headers['x-environment'] as string || 'live';

  return {
    Authorization: authHeader || '',
    'x-tenant-id': tenantId,
    'x-environment': environment,
    'Content-Type': 'application/json'
  };
};

// =================================================================
// GET /defaults - Get all seed previews
// =================================================================
router.get('/defaults', async (req: Request, res: Response) => {
  try {
    const previews = getAllSeedPreviews();

    return res.status(200).json({
      success: true,
      data: previews,
      categories: getAllSeedCategories(),
      requiredCategories: getRequiredSeedCategories()
    });
  } catch (error: any) {
    console.error('[SeedRoutes] Error getting defaults:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to get seed defaults'
    });
  }
});

// =================================================================
// GET /defaults/:category - Get preview for specific category
// =================================================================
router.get('/defaults/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const preview = getSeedPreview(category);

    if (!preview) {
      return res.status(404).json({
        error: `Seed category '${category}' not found`,
        availableCategories: getAllSeedCategories()
      });
    }

    return res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error: any) {
    console.error('[SeedRoutes] Error getting category defaults:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to get seed defaults'
    });
  }
});

// =================================================================
// GET /data/:category - Get raw seed data for a category
// =================================================================
router.get('/data/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (!SeedRegistry[category]) {
      return res.status(404).json({
        error: `Seed category '${category}' not found`,
        availableCategories: getAllSeedCategories()
      });
    }

    const data = getSeedData(category);

    return res.status(200).json({
      success: true,
      category,
      count: data.length,
      data
    });
  } catch (error: any) {
    console.error('[SeedRoutes] Error getting category data:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to get seed data'
    });
  }
});

// =================================================================
// POST /tenant - Seed all required data for tenant
// =================================================================
router.post('/tenant', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] as string;
    const environment = req.headers['x-environment'] as string || 'live';
    const isLive = environment === 'live';

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header is required' });
    }

    // Get categories to seed (from body or default to required)
    const requestedCategories = req.body.categories || getRequiredSeedCategories();

    // Sort by dependencies
    const sortedCategories = sortSeedsByDependencies(requestedCategories);

    console.log('[SeedRoutes] POST /tenant', {
      tenantId,
      environment,
      categories: sortedCategories
    });

    const results: SeedResult[] = [];
    let totalInserted = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    // Seed each category
    for (const category of sortedCategories) {
      try {
        const result = await seedCategory(
          category,
          tenantId,
          isLive,
          authHeader
        );
        results.push(result);
        totalInserted += result.inserted;
        totalSkipped += result.skipped;

        if (!result.success) {
          errors.push(...result.errors);
        }
      } catch (error: any) {
        console.error(`[SeedRoutes] Error seeding ${category}:`, error.message);
        results.push({
          success: false,
          category,
          displayName: SeedRegistry[category]?.displayName || category,
          inserted: 0,
          skipped: 0,
          errors: [error.message]
        });
        errors.push(`${category}: ${error.message}`);
      }
    }

    const response: TenantSeedResult = {
      success: errors.length === 0,
      tenantId,
      environment: isLive ? 'live' : 'test',
      results,
      totalInserted,
      totalSkipped,
      errors,
      timestamp: new Date().toISOString()
    };

    return res.status(errors.length === 0 ? 200 : 207).json(response);
  } catch (error: any) {
    console.error('[SeedRoutes] Error seeding tenant:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed tenant data'
    });
  }
});

// =================================================================
// POST /tenant/:category - Seed specific category for tenant
// =================================================================
router.post('/tenant/:category', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] as string;
    const environment = req.headers['x-environment'] as string || 'live';
    const isLive = environment === 'live';
    const { category } = req.params;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header is required' });
    }

    if (!SeedRegistry[category]) {
      return res.status(404).json({
        error: `Seed category '${category}' not found`,
        availableCategories: getAllSeedCategories()
      });
    }

    console.log('[SeedRoutes] POST /tenant/:category', {
      tenantId,
      environment,
      category
    });

    const result = await seedCategory(category, tenantId, isLive, authHeader);

    return res.status(result.success ? 200 : 500).json({
      success: result.success,
      data: result
    });
  } catch (error: any) {
    console.error('[SeedRoutes] Error seeding category:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed category'
    });
  }
});

// =================================================================
// GET /status - Check seed status for tenant
// =================================================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] as string;
    const environment = req.headers['x-environment'] as string || 'live';

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header is required' });
    }

    console.log('[SeedRoutes] GET /status', { tenantId, environment });

    // Check sequences status
    const sequencesStatus = await checkSequencesSeeded(tenantId, environment, authHeader);

    const statuses = [
      {
        category: 'sequences',
        displayName: 'Sequence Numbers',
        isSeeded: sequencesStatus.isSeeded,
        count: sequencesStatus.count
      }
      // Add more status checks as needed
    ];

    const allSeeded = statuses.every(s => s.isSeeded);
    const requiredSeeded = statuses
      .filter(s => getRequiredSeedCategories().includes(s.category))
      .every(s => s.isSeeded);

    return res.status(200).json({
      success: true,
      tenantId,
      environment,
      allSeeded,
      requiredSeeded,
      statuses
    });
  } catch (error: any) {
    console.error('[SeedRoutes] Error checking status:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check seed status'
    });
  }
});

// =================================================================
// Helper: Seed a specific category
// =================================================================
async function seedCategory(
  category: string,
  tenantId: string,
  isLive: boolean,
  authHeader: string
): Promise<SeedResult> {
  const definition = SeedRegistry[category];

  if (!definition) {
    throw new Error(`Seed category '${category}' not found`);
  }

  // For sequences, call the sequences edge function with seed data
  if (category === 'sequences') {
    return await seedSequences(tenantId, isLive, authHeader);
  }

  // Generic handling for other categories (future)
  throw new Error(`Seed execution not implemented for category: ${category}`);
}

// =================================================================
// Helper: Seed sequences via edge function
// =================================================================
async function seedSequences(
  tenantId: string,
  isLive: boolean,
  authHeader: string
): Promise<SeedResult> {
  try {
    // Send seed data TO the edge function
    const response = await axios.post(
      `${process.env.SUPABASE_URL}/functions/v1/sequences/seed`,
      {
        seedData: SEQUENCE_SEED_DATA  // Pass data from API layer
      },
      {
        headers: {
          Authorization: authHeader,
          'x-tenant-id': tenantId,
          'x-environment': isLive ? 'live' : 'test',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      category: 'sequences',
      displayName: 'Sequence Numbers',
      inserted: response.data.seeded_count || response.data.data?.length || 0,
      skipped: response.data.skipped_count || 0,
      errors: [],
      items: response.data.sequences || response.data.data?.map((s: any) => s.code) || []
    };
  } catch (error: any) {
    console.error('[SeedRoutes] Error seeding sequences:', error.message);
    return {
      success: false,
      category: 'sequences',
      displayName: 'Sequence Numbers',
      inserted: 0,
      skipped: 0,
      errors: [error.response?.data?.error || error.message]
    };
  }
}

// =================================================================
// Helper: Check if sequences are already seeded
// =================================================================
async function checkSequencesSeeded(
  tenantId: string,
  environment: string,
  authHeader: string
): Promise<{ isSeeded: boolean; count: number }> {
  try {
    const response = await axios.get(
      `${process.env.SUPABASE_URL}/functions/v1/sequences/configs`,
      {
        headers: {
          Authorization: authHeader,
          'x-tenant-id': tenantId,
          'x-environment': environment,
          'Content-Type': 'application/json'
        }
      }
    );

    const count = response.data.data?.length || 0;
    return {
      isSeeded: count > 0,
      count
    };
  } catch (error: any) {
    console.error('[SeedRoutes] Error checking sequences:', error.message);
    return { isSeeded: false, count: 0 };
  }
}

export default router;

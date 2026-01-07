// backend/src/routes/familyKnowsRoutes.ts
// Routes for FamilyKnows Edge Function proxying
// Handles /api/FKauth/* and /api/FKonboarding/* requests

import { Router, Request, Response } from 'express';
import { familyKnowsService } from '../services/familyKnowsService';

// ============================================
// FKauth Router
// ============================================
export const fkauthRouter = Router();

/**
 * Helper to extract headers from request
 */
const extractHeaders = (req: Request): Record<string, string> => {
  const headers: Record<string, string> = {};

  // Forward all relevant headers
  const headersToForward = [
    'authorization',
    'x-tenant-id',
    'x-environment',
    'x-product',
    'x-user-id',
    'content-type',
  ];

  for (const header of headersToForward) {
    const value = req.headers[header];
    if (typeof value === 'string') {
      headers[header] = value;
    }
  }

  return headers;
};

/**
 * Helper to send proxy response
 */
const sendProxyResponse = (res: Response, proxyResult: any) => {
  // Forward relevant headers from edge function response
  if (proxyResult.headers) {
    const headersToForward = ['content-type', 'x-request-id'];
    for (const header of headersToForward) {
      if (proxyResult.headers[header]) {
        res.setHeader(header, proxyResult.headers[header]);
      }
    }
  }

  res.status(proxyResult.status).json(proxyResult.data);
};

// POST /api/FKauth/login
fkauthRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /login');

    const result = await familyKnowsService.login(email, password, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Login error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/register
fkauthRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /register');

    const result = await familyKnowsService.register(req.body, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Register error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/signout
fkauthRouter.post('/signout', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /signout');

    const result = await familyKnowsService.signout(headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Signout error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// GET /api/FKauth/user
fkauthRouter.get('/user', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] GET /user');

    const result = await familyKnowsService.getUser(headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Get user error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/refresh-token
fkauthRouter.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /refresh-token');

    const result = await familyKnowsService.refreshToken(refresh_token, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Refresh token error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/reset-password
fkauthRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /reset-password');

    const result = await familyKnowsService.proxyFKauth({
      method: 'POST',
      path: '/reset-password',
      headers,
      body: req.body,
    });
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Reset password error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/change-password
fkauthRouter.post('/change-password', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /change-password');

    const result = await familyKnowsService.proxyFKauth({
      method: 'POST',
      path: '/change-password',
      headers,
      body: req.body,
    });
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Change password error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/verify-password
fkauthRouter.post('/verify-password', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /verify-password');

    const result = await familyKnowsService.proxyFKauth({
      method: 'POST',
      path: '/verify-password',
      headers,
      body: req.body,
    });
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Verify password error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKauth/complete-registration
fkauthRouter.post('/complete-registration', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] POST /complete-registration');

    const result = await familyKnowsService.proxyFKauth({
      method: 'POST',
      path: '/complete-registration',
      headers,
      body: req.body,
    });
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Complete registration error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// PATCH /api/FKauth/preferences
fkauthRouter.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKauth Route] PATCH /preferences');

    const result = await familyKnowsService.proxyFKauth({
      method: 'PATCH',
      path: '/preferences',
      headers,
      body: req.body,
    });
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKauth Route] Update preferences error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// FKonboarding Router
// ============================================
export const fkonboardingRouter = Router();

// GET /api/FKonboarding/status
fkonboardingRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] GET /status');

    const result = await familyKnowsService.getOnboardingStatus(headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Get status error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// GET /api/FKonboarding/config
fkonboardingRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] GET /config');

    const result = await familyKnowsService.getOnboardingConfig(headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Get config error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKonboarding/initialize
fkonboardingRouter.post('/initialize', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] POST /initialize');

    const result = await familyKnowsService.initializeOnboarding(req.body, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Initialize error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKonboarding/complete-step
fkonboardingRouter.post('/complete-step', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] POST /complete-step');
    console.log('[FKonboarding Route] Body:', JSON.stringify(req.body));

    const result = await familyKnowsService.completeStep(req.body, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Complete step error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// PUT /api/FKonboarding/skip-step
fkonboardingRouter.put('/skip-step', async (req: Request, res: Response) => {
  try {
    const { step_id } = req.body;
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] PUT /skip-step');

    const result = await familyKnowsService.skipStep(step_id, headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Skip step error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// POST /api/FKonboarding/complete
fkonboardingRouter.post('/complete', async (req: Request, res: Response) => {
  try {
    const headers = extractHeaders(req);

    console.log('[FKonboarding Route] POST /complete');

    const result = await familyKnowsService.completeOnboarding(headers);
    sendProxyResponse(res, result);
  } catch (error: any) {
    console.error('[FKonboarding Route] Complete onboarding error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default { fkauthRouter, fkonboardingRouter };

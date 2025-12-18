// src/services/jtdService.ts
// JTD Service - New JTD Framework with PGMQ and MSG91
// Replaces old n_events based service

import axios from 'axios';
import crypto from 'crypto';
import { captureException } from '../utils/sentry';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supabaseConfig';

// =================================================================
// TYPES AND INTERFACES
// =================================================================

export interface CreateJTDRequest {
  event_type: string;
  channel: string;
  tenant_id: string;
  source_type: string;
  source_id?: string;
  recipient_data: {
    user_id?: string;
    email?: string;
    mobile?: string;
    name?: string;
  };
  template_data?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduled_for?: string; // ISO date string
  priority?: number;
  is_live?: boolean;
}

export interface JTDRecord {
  id: string;
  event_type: string;
  channel: string;
  tenant_id: string;
  source_type: string;
  source_id?: string;
  current_status: string;
  priority: number;
  scheduled_for?: string;
  recipient_data: Record<string, any>;
  template_data: Record<string, any>;
  metadata: Record<string, any>;
  provider_message_id?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  error_message?: string;
  is_live: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MSG91WebhookPayload {
  // Email webhook
  request_id?: string;
  event?: string;
  email?: string;
  // SMS webhook
  status?: string;
  mobile?: string;
  // WhatsApp webhook
  message_id?: string;
  error_code?: string;
  error_message?: string;
  timestamp?: string;
  description?: string;
}

export interface InternalSignatureHeaders {
  'x-signature': string;
  'x-timestamp': string;
  'x-request-id'?: string;
}

// =================================================================
// CONSTANTS
// =================================================================

const VANI_UUID = '00000000-0000-0000-0000-000000000001';
const INTERNAL_SIGNING_SECRET = process.env.INTERNAL_SIGNING_SECRET || '';
const MSG91_WEBHOOK_SECRET = process.env.MSG91_WEBHOOK_SECRET || '';

// =================================================================
// JTD SERVICE CLASS
// =================================================================

class JTDService {
  private supabaseUrl: string;
  private serviceKey: string;

  constructor() {
    this.supabaseUrl = SUPABASE_URL || '';
    this.serviceKey = SUPABASE_KEY || '';
  }

  // =================================================================
  // INTERNAL SIGNATURE METHODS (Edge <-> API)
  // =================================================================

  /**
   * Generate HMAC signature for internal API calls
   * Format: METHOD|PATH|PAYLOAD|TIMESTAMP
   */
  generateInternalSignature(
    method: string,
    path: string,
    payload: string,
    timestamp: number
  ): string {
    if (!INTERNAL_SIGNING_SECRET) {
      console.warn('[JTD] INTERNAL_SIGNING_SECRET not configured');
      return '';
    }

    const signatureString = `${method.toUpperCase()}|${path}|${payload}|${timestamp}`;
    const hmac = crypto.createHmac('sha256', INTERNAL_SIGNING_SECRET);
    hmac.update(signatureString, 'utf8');
    return hmac.digest('hex');
  }

  /**
   * Generate headers for internal API calls
   */
  generateInternalHeaders(
    method: string,
    path: string,
    payload: any = null
  ): InternalSignatureHeaders {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = payload ? JSON.stringify(payload) : '';
    const signature = this.generateInternalSignature(method, path, payloadString, timestamp);

    return {
      'x-signature': signature,
      'x-timestamp': timestamp.toString(),
      'x-request-id': `jtd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Verify internal signature from Edge Function or other services
   */
  verifyInternalSignature(
    method: string,
    path: string,
    payload: string,
    providedSignature: string,
    timestamp: number,
    toleranceSeconds: number = 300 // 5 minutes
  ): { valid: boolean; error?: string } {
    if (!INTERNAL_SIGNING_SECRET) {
      console.warn('[JTD] INTERNAL_SIGNING_SECRET not configured - skipping verification');
      return { valid: true };
    }

    // Check timestamp tolerance
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);

    if (timeDifference > toleranceSeconds) {
      return {
        valid: false,
        error: `Timestamp expired. Difference: ${timeDifference}s, tolerance: ${toleranceSeconds}s`
      };
    }

    // Generate expected signature
    const expectedSignature = this.generateInternalSignature(method, path, payload, timestamp);

    // Constant-time comparison
    try {
      const signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!signaturesMatch) {
        return { valid: false, error: 'Signature mismatch' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Signature verification failed' };
    }
  }

  // =================================================================
  // MSG91 WEBHOOK SIGNATURE VERIFICATION
  // =================================================================

  /**
   * Verify MSG91 webhook signature
   * MSG91 uses IP whitelist + optional webhook secret
   */
  verifyMSG91Webhook(
    payload: string,
    providedSignature?: string
  ): { valid: boolean; error?: string } {
    // If no secret configured, skip signature verification
    // (rely on IP whitelist in production)
    if (!MSG91_WEBHOOK_SECRET) {
      console.warn('[JTD] MSG91_WEBHOOK_SECRET not configured - relying on IP whitelist');
      return { valid: true };
    }

    if (!providedSignature) {
      return { valid: false, error: 'Missing webhook signature' };
    }

    // MSG91 signature verification (if they provide one)
    const expectedSignature = crypto
      .createHmac('sha256', MSG91_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    try {
      const signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!signaturesMatch) {
        return { valid: false, error: 'MSG91 signature mismatch' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'MSG91 signature verification failed' };
    }
  }

  // =================================================================
  // JTD CRUD OPERATIONS
  // =================================================================

  /**
   * Create a new JTD entry
   * DB trigger will auto-enqueue to PGMQ
   */
  async createJTD(data: CreateJTDRequest): Promise<JTDRecord> {
    try {
      const jtdData = {
        event_type: data.event_type,
        channel: data.channel,
        tenant_id: data.tenant_id,
        source_type: data.source_type,
        source_id: data.source_id || null,
        current_status: 'created', // Will change to 'pending' after enqueue
        priority: data.priority || 5,
        scheduled_for: data.scheduled_for || null,
        recipient_data: data.recipient_data,
        template_data: data.template_data || {},
        metadata: data.metadata || {},
        is_live: data.is_live !== undefined ? data.is_live : false, // Default to test mode
        is_active: true,
        created_by: VANI_UUID,
        updated_by: VANI_UUID
      };

      const response = await axios.post(
        `${this.supabaseUrl}/rest/v1/n_jtd`,
        jtdData,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      const jtd = response.data[0];
      console.log(`[JTD] Created JTD ${jtd.id} - ${data.event_type} via ${data.channel}`);
      return jtd;

    } catch (error) {
      console.error('[JTD] Error creating JTD:', error);
      captureException(error as Error, {
        tags: { component: 'JTDService', action: 'createJTD' },
        extra: { event_type: data.event_type, channel: data.channel }
      });
      throw error;
    }
  }

  /**
   * Get JTD by ID with status history
   */
  async getJTD(jtdId: string): Promise<JTDRecord | null> {
    try {
      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd?id=eq.${jtdId}&select=*`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data[0] || null;

    } catch (error) {
      console.error('[JTD] Error fetching JTD:', error);
      throw error;
    }
  }

  /**
   * Get JTD with full status history
   */
  async getJTDWithHistory(jtdId: string): Promise<JTDRecord & { status_history: any[] } | null> {
    try {
      // Get JTD
      const jtd = await this.getJTD(jtdId);
      if (!jtd) return null;

      // Get status history
      const historyResponse = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd_status_history?jtd_id=eq.${jtdId}&order=changed_at.desc`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        ...jtd,
        status_history: historyResponse.data
      };

    } catch (error) {
      console.error('[JTD] Error fetching JTD with history:', error);
      throw error;
    }
  }

  /**
   * Query JTDs for a tenant with filters
   */
  async queryJTDs(
    tenantId: string,
    filters: {
      event_type?: string;
      channel?: string;
      source_type?: string;
      source_id?: string;
      status?: string;
      is_live?: boolean;
      from_date?: string;
      to_date?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: JTDRecord[]; count: number }> {
    try {
      let query = `tenant_id=eq.${tenantId}&is_active=eq.true`;

      if (filters.event_type) query += `&event_type=eq.${filters.event_type}`;
      if (filters.channel) query += `&channel=eq.${filters.channel}`;
      if (filters.source_type) query += `&source_type=eq.${filters.source_type}`;
      if (filters.source_id) query += `&source_id=eq.${filters.source_id}`;
      if (filters.status) query += `&current_status=eq.${filters.status}`;
      if (filters.is_live !== undefined) query += `&is_live=eq.${filters.is_live}`;
      if (filters.from_date) query += `&created_at=gte.${filters.from_date}`;
      if (filters.to_date) query += `&created_at=lte.${filters.to_date}`;

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query += `&limit=${limit}&offset=${offset}&order=created_at.desc`;

      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd?${query}`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        }
      );

      const count = parseInt(response.headers['content-range']?.split('/')[1] || '0');

      return {
        data: response.data,
        count
      };

    } catch (error) {
      console.error('[JTD] Error querying JTDs:', error);
      throw error;
    }
  }

  // =================================================================
  // STATUS UPDATE METHODS
  // =================================================================

  /**
   * Update JTD status
   * Called by Edge Function worker or webhook handlers
   */
  async updateStatus(
    jtdId: string,
    status: string,
    options: {
      provider_message_id?: string;
      error_message?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        current_status: status,
        updated_by: VANI_UUID,
        updated_at: new Date().toISOString()
      };

      if (options.provider_message_id) {
        updateData.provider_message_id = options.provider_message_id;
      }

      if (options.error_message) {
        updateData.error_message = options.error_message;
      }

      // Set timestamp based on status
      switch (status) {
        case 'sent':
          updateData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'failed':
          updateData.failed_at = new Date().toISOString();
          break;
      }

      // Merge additional metadata if provided
      if (options.metadata) {
        // Fetch current metadata first
        const current = await this.getJTD(jtdId);
        if (current) {
          updateData.metadata = { ...current.metadata, ...options.metadata };
        }
      }

      await axios.patch(
        `${this.supabaseUrl}/rest/v1/n_jtd?id=eq.${jtdId}`,
        updateData,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[JTD] Updated status for ${jtdId} to ${status}`);

    } catch (error) {
      console.error('[JTD] Error updating status:', error);
      throw error;
    }
  }

  /**
   * Find JTD by provider message ID (for webhook callbacks)
   */
  async findByProviderMessageId(providerMessageId: string): Promise<JTDRecord | null> {
    try {
      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd?provider_message_id=eq.${providerMessageId}&limit=1`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data[0] || null;

    } catch (error) {
      console.error('[JTD] Error finding JTD by provider message ID:', error);
      throw error;
    }
  }

  // =================================================================
  // MSG91 WEBHOOK HANDLERS
  // =================================================================

  /**
   * Handle MSG91 Email webhook
   */
  async handleMSG91EmailWebhook(payload: MSG91WebhookPayload): Promise<void> {
    const { request_id, event, email } = payload;

    if (!request_id) {
      console.warn('[JTD] MSG91 email webhook missing request_id');
      return;
    }

    const jtd = await this.findByProviderMessageId(request_id);
    if (!jtd) {
      console.warn(`[JTD] No JTD found for MSG91 request_id: ${request_id}`);
      return;
    }

    const status = this.mapMSG91EmailStatus(event || '');
    await this.updateStatus(jtd.id, status, {
      metadata: { webhook_event: event, recipient_email: email }
    });

    console.log(`[JTD] MSG91 email webhook processed: ${jtd.id} -> ${status}`);
  }

  /**
   * Handle MSG91 SMS webhook
   */
  async handleMSG91SMSWebhook(payload: MSG91WebhookPayload): Promise<void> {
    const { request_id, status, mobile } = payload;

    if (!request_id) {
      console.warn('[JTD] MSG91 SMS webhook missing request_id');
      return;
    }

    const jtd = await this.findByProviderMessageId(request_id);
    if (!jtd) {
      console.warn(`[JTD] No JTD found for MSG91 request_id: ${request_id}`);
      return;
    }

    const mappedStatus = this.mapMSG91SMSStatus(status || '');
    await this.updateStatus(jtd.id, mappedStatus, {
      metadata: { webhook_status: status, recipient_mobile: mobile }
    });

    console.log(`[JTD] MSG91 SMS webhook processed: ${jtd.id} -> ${mappedStatus}`);
  }

  /**
   * Handle MSG91 WhatsApp webhook
   */
  async handleMSG91WhatsAppWebhook(payload: MSG91WebhookPayload): Promise<void> {
    const { message_id, status, mobile, error_code, error_message } = payload;

    if (!message_id) {
      console.warn('[JTD] MSG91 WhatsApp webhook missing message_id');
      return;
    }

    const jtd = await this.findByProviderMessageId(message_id);
    if (!jtd) {
      console.warn(`[JTD] No JTD found for MSG91 message_id: ${message_id}`);
      return;
    }

    const mappedStatus = this.mapMSG91WhatsAppStatus(status || '');
    await this.updateStatus(jtd.id, mappedStatus, {
      error_message: error_message,
      metadata: {
        webhook_status: status,
        recipient_mobile: mobile,
        error_code: error_code
      }
    });

    console.log(`[JTD] MSG91 WhatsApp webhook processed: ${jtd.id} -> ${mappedStatus}`);
  }

  // =================================================================
  // STATUS MAPPING HELPERS
  // =================================================================

  private mapMSG91EmailStatus(event: string): string {
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'opened': 'read',
      'clicked': 'read',
      'bounced': 'failed',
      'dropped': 'failed',
      'spam': 'failed',
      'unsubscribed': 'failed'
    };
    return statusMap[event.toLowerCase()] || 'sent';
  }

  private mapMSG91SMSStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'DELIVRD': 'delivered',
      'DELIVERED': 'delivered',
      'SENT': 'sent',
      'FAILED': 'failed',
      'EXPIRED': 'failed',
      'UNDELIV': 'failed',
      'REJECTD': 'failed',
      'REJECTED': 'failed'
    };
    return statusMap[status.toUpperCase()] || 'sent';
  }

  private mapMSG91WhatsAppStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed'
    };
    return statusMap[status.toLowerCase()] || 'sent';
  }

  // =================================================================
  // TRIGGER EDGE FUNCTION (for manual processing)
  // =================================================================

  /**
   * Manually trigger the JTD worker Edge Function
   * Used for processing scheduled JTDs or retrying
   */
  async triggerWorker(): Promise<{ success: boolean; result?: any; error?: string }> {
    const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL ||
      `${this.supabaseUrl}/functions/v1`;

    try {
      const path = '/jtd-worker';
      const method = 'POST';
      const payload = { trigger: 'manual', timestamp: new Date().toISOString() };

      // Generate internal signature
      const headers = this.generateInternalHeaders(method, path, payload);

      const response = await axios.post(
        `${edgeFunctionUrl}${path}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json',
            ...headers
          }
        }
      );

      console.log('[JTD] Worker triggered successfully:', response.data);
      return { success: true, result: response.data };

    } catch (error: any) {
      console.error('[JTD] Error triggering worker:', error);
      return {
        success: false,
        error: error.message || 'Failed to trigger worker'
      };
    }
  }

  // =================================================================
  // REPROCESS QUEUED EVENTS (Called on server startup)
  // =================================================================

  /**
   * Reprocess any JTDs that were stuck in processing state
   * Called on server startup to recover from crashes
   */
  async reprocessQueuedEvents(): Promise<void> {
    try {
      console.log('[JTD] Checking for stuck JTDs to reprocess...');

      // Find JTDs stuck in 'processing' status (likely from a crash)
      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd?status_code=eq.processing&is_active=eq.true&limit=100`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const stuckJTDs = response.data;

      if (stuckJTDs.length === 0) {
        console.log('[JTD] No stuck JTDs found');
        return;
      }

      console.log(`[JTD] Found ${stuckJTDs.length} stuck JTDs, resetting to pending...`);

      // Reset them to 'pending' so they get picked up by the worker
      for (const jtd of stuckJTDs) {
        await axios.patch(
          `${this.supabaseUrl}/rest/v1/n_jtd?id=eq.${jtd.id}`,
          {
            status_code: 'pending',
            updated_at: new Date().toISOString(),
            updated_by: VANI_UUID
          },
          {
            headers: {
              'apikey': this.serviceKey,
              'Authorization': `Bearer ${this.serviceKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      console.log(`[JTD] Reset ${stuckJTDs.length} JTDs to pending status`);

      // Optionally trigger the worker to process them
      // await this.triggerWorker();

    } catch (error) {
      console.error('[JTD] Error reprocessing queued events:', error);
      // Don't throw - this is a startup task, we don't want to crash the server
      captureException(error as Error, {
        tags: { component: 'JTDService', action: 'reprocessQueuedEvents' }
      });
    }
  }

  // =================================================================
  // ANALYTICS & METRICS
  // =================================================================

  /**
   * Get JTD metrics for a tenant
   */
  async getMetrics(
    tenantId: string,
    options: { from_date?: string; to_date?: string; group_by?: 'event_type' | 'channel' | 'status' } = {}
  ): Promise<Record<string, any>> {
    try {
      // Get counts by status
      let query = `tenant_id=eq.${tenantId}&is_active=eq.true`;
      if (options.from_date) query += `&created_at=gte.${options.from_date}`;
      if (options.to_date) query += `&created_at=lte.${options.to_date}`;

      const response = await axios.get(
        `${this.supabaseUrl}/rest/v1/n_jtd?${query}&select=current_status,event_type,channel`,
        {
          headers: {
            'apikey': this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const jtds = response.data;

      // Calculate metrics
      const metrics = {
        total: jtds.length,
        by_status: {} as Record<string, number>,
        by_event_type: {} as Record<string, number>,
        by_channel: {} as Record<string, number>,
        success_rate: 0,
        delivery_rate: 0
      };

      for (const jtd of jtds) {
        // By status
        metrics.by_status[jtd.current_status] = (metrics.by_status[jtd.current_status] || 0) + 1;
        // By event type
        metrics.by_event_type[jtd.event_type] = (metrics.by_event_type[jtd.event_type] || 0) + 1;
        // By channel
        metrics.by_channel[jtd.channel] = (metrics.by_channel[jtd.channel] || 0) + 1;
      }

      // Calculate rates
      const sentOrBetter = (metrics.by_status['sent'] || 0) +
        (metrics.by_status['delivered'] || 0) +
        (metrics.by_status['read'] || 0);
      const delivered = (metrics.by_status['delivered'] || 0) + (metrics.by_status['read'] || 0);

      if (metrics.total > 0) {
        metrics.success_rate = Math.round((sentOrBetter / metrics.total) * 100);
        metrics.delivery_rate = sentOrBetter > 0 ? Math.round((delivered / sentOrBetter) * 100) : 0;
      }

      return metrics;

    } catch (error) {
      console.error('[JTD] Error fetching metrics:', error);
      throw error;
    }
  }

}

// =================================================================
// SINGLETON EXPORT
// =================================================================

export const jtdService = new JTDService();

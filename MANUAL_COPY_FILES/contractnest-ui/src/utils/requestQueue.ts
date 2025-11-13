// src/utils/requestQueue.ts
// PRODUCTION GRADE: Request Queue Manager for High Concurrency (500-600 requests)
//
// Features:
// - Concurrency limiting to prevent browser/server overload
// - Request prioritization (high/normal/low)
// - Automatic retry with exponential backoff
// - Request deduplication
// - Memory-efficient queue management
// - Request cancellation support

import { AxiosRequestConfig, AxiosResponse } from 'axios';

interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  priority: 'high' | 'normal' | 'low';
  resolve: (value: AxiosResponse) => void;
  reject: (error: any) => void;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
}

interface RequestQueueConfig {
  maxConcurrent: number; // Maximum concurrent requests
  maxQueueSize: number; // Maximum queue size
  requestTimeout: number; // Request timeout in ms
  retryDelay: number; // Base retry delay in ms
  deduplicationWindow: number; // Deduplication window in ms
}

class RequestQueueManager {
  private queue: QueuedRequest[] = [];
  private activeRequests: Map<string, AbortController> = new Map();
  private pendingRequests: Map<string, Promise<AxiosResponse>> = new Map();
  private recentRequests: Map<string, { timestamp: number; response: AxiosResponse }> = new Map();

  private config: RequestQueueConfig = {
    maxConcurrent: 50, // PRODUCTION: Limit to 50 concurrent requests
    maxQueueSize: 1000, // PRODUCTION: Max 1000 queued requests
    requestTimeout: 30000, // 30 seconds
    retryDelay: 1000, // 1 second base delay
    deduplicationWindow: 5000, // 5 seconds
  };

  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    deduplicatedRequests: 0,
    queuedRequests: 0,
    activeCount: 0,
  };

  constructor(customConfig?: Partial<RequestQueueConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Clean up old requests periodically
    setInterval(() => this.cleanupOldRequests(), 60000); // Every minute
  }

  /**
   * Add request to queue with priority
   */
  public async enqueue(
    executor: (abortSignal: AbortSignal) => Promise<AxiosResponse>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      maxRetries?: number;
      deduplicate?: boolean;
      deduplicationKey?: string;
    } = {}
  ): Promise<AxiosResponse> {
    const {
      priority = 'normal',
      maxRetries = 3,
      deduplicate = true,
      deduplicationKey = this.generateRequestKey(executor.toString()),
    } = options;

    this.stats.totalRequests++;

    // Check for recent duplicate requests
    if (deduplicate && deduplicationKey) {
      const recent = this.recentRequests.get(deduplicationKey);
      if (recent && Date.now() - recent.timestamp < this.config.deduplicationWindow) {
        this.stats.deduplicatedRequests++;
        console.log(`🔄 Deduplicated request: ${deduplicationKey}`);
        return recent.response;
      }

      // Check for pending duplicate requests
      const pending = this.pendingRequests.get(deduplicationKey);
      if (pending) {
        this.stats.deduplicatedRequests++;
        console.log(`⏳ Request already pending: ${deduplicationKey}`);
        return pending;
      }
    }

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove lowest priority items if queue is full
      this.queue = this.queue.filter(req => req.priority !== 'low').slice(0, this.config.maxQueueSize - 1);
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queuedRequest: QueuedRequest = {
        id: requestId,
        config: { executor, deduplicationKey } as any,
        priority,
        resolve,
        reject,
        retryCount: 0,
        maxRetries,
        timestamp: Date.now(),
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.queue.unshift(queuedRequest);
      } else if (priority === 'low') {
        this.queue.push(queuedRequest);
      } else {
        // Normal priority - insert in middle
        const normalIndex = this.queue.findIndex(req => req.priority === 'low');
        if (normalIndex === -1) {
          this.queue.push(queuedRequest);
        } else {
          this.queue.splice(normalIndex, 0, queuedRequest);
        }
      }

      this.stats.queuedRequests = this.queue.length;
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    while (
      this.queue.length > 0 &&
      this.activeRequests.size < this.config.maxConcurrent
    ) {
      const request = this.queue.shift();
      if (!request) break;

      this.stats.queuedRequests = this.queue.length;
      await this.executeRequest(request);
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const abortController = new AbortController();
    this.activeRequests.set(request.id, abortController);
    this.stats.activeCount = this.activeRequests.size;

    const executor = (request.config as any).executor;
    const deduplicationKey = (request.config as any).deduplicationKey;

    try {
      // Set timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.requestTimeout);

      // Create promise and store for deduplication
      const requestPromise = executor(abortController.signal);
      if (deduplicationKey) {
        this.pendingRequests.set(deduplicationKey, requestPromise);
      }

      const response = await requestPromise;

      clearTimeout(timeoutId);

      // Store successful response for deduplication
      if (deduplicationKey) {
        this.recentRequests.set(deduplicationKey, {
          timestamp: Date.now(),
          response,
        });
        this.pendingRequests.delete(deduplicationKey);
      }

      this.stats.successfulRequests++;
      request.resolve(response);
    } catch (error: any) {
      // Handle retry logic
      if (request.retryCount < request.maxRetries && !abortController.signal.aborted) {
        request.retryCount++;
        this.stats.retriedRequests++;

        const retryDelay = this.calculateRetryDelay(request.retryCount);
        console.log(`🔄 Retrying request (${request.retryCount}/${request.maxRetries}) in ${retryDelay}ms`);

        setTimeout(() => {
          this.queue.unshift(request); // Put back at front for retry
          this.processQueue();
        }, retryDelay);
      } else {
        // Failed after all retries
        this.stats.failedRequests++;
        if (deduplicationKey) {
          this.pendingRequests.delete(deduplicationKey);
        }
        request.reject(error);
      }
    } finally {
      this.activeRequests.delete(request.id);
      this.stats.activeCount = this.activeRequests.size;
      this.processQueue(); // Process next request
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.config.retryDelay * Math.pow(2, retryCount - 1);
    const maxDelay = 30000; // Max 30 seconds
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate request key for deduplication
   */
  private generateRequestKey(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `key_${hash}`;
  }

  /**
   * Clean up old requests from recent cache
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.config.deduplicationWindow;

    for (const [key, value] of this.recentRequests.entries()) {
      if (value.timestamp < cutoff) {
        this.recentRequests.delete(key);
      }
    }

    console.log(`🧹 Cleaned up ${this.recentRequests.size} recent requests`);
  }

  /**
   * Cancel a specific request
   */
  public cancelRequest(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel all requests
   */
  public cancelAll(): void {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
    this.queue = [];
    this.pendingRequests.clear();
    this.stats.queuedRequests = 0;
    this.stats.activeCount = 0;
  }

  /**
   * Get current stats
   */
  public getStats() {
    return {
      ...this.stats,
      queueSize: this.queue.length,
      recentCacheSize: this.recentRequests.size,
      pendingCount: this.pendingRequests.size,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RequestQueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// PRODUCTION: Export singleton instance
export const requestQueue = new RequestQueueManager({
  maxConcurrent: 50, // Handle 50 concurrent requests
  maxQueueSize: 1000, // Queue up to 1000 requests
  requestTimeout: 30000, // 30 second timeout
  retryDelay: 1000, // 1 second base retry delay
  deduplicationWindow: 5000, // 5 second deduplication window
});

// Export class for testing or custom instances
export { RequestQueueManager };
export type { RequestQueueConfig, QueuedRequest };

//src/services/maintenanceService.ts

import api from './api';
import { API_ENDPOINTS } from './serviceURLs';

interface MaintenanceStatus {
  isInMaintenance: boolean;
  estimatedEndTime: string | null;
  message?: string;
  /** When the interceptor cached this. Absent on values written before the fix. */
  storedAt?: number;
}

const NOT_IN_MAINTENANCE: MaintenanceStatus = { isInMaintenance: false, estimatedEndTime: null };

/**
 * How long a cached maintenance verdict is trusted before asking the API again.
 *
 * It used to be trusted FOREVER: the stored value was returned first and
 * unconditionally, and nothing ever wrote false or removed it, so one 503
 * pinned the session behind the maintenance page until sessionStorage was
 * cleared by hand. The interceptor now clears it on any successful response;
 * this is the second line of defence for the case where no request succeeds
 * in between.
 */
const MAINTENANCE_CACHE_TTL_MS = 60 * 1000;

export const maintenanceService = {
  async checkMaintenanceStatus(): Promise<MaintenanceStatus> {
    // A cached verdict is a hint with an expiry, never a permanent answer.
    const storedInfo = sessionStorage.getItem('maintenance_info');
    if (storedInfo) {
      try {
        const parsed = JSON.parse(storedInfo) as MaintenanceStatus;
        const fresh =
          typeof parsed?.storedAt === 'number' &&
          Date.now() - parsed.storedAt < MAINTENANCE_CACHE_TTL_MS;

        // Trust it only while fresh AND actually saying maintenance. Anything
        // else - stale, malformed, or written before storedAt existed - is
        // dropped so the API gets to answer instead.
        if (fresh && parsed.isInMaintenance === true) {
          return parsed;
        }
        sessionStorage.removeItem('maintenance_info');
      } catch (e) {
        console.error('Failed to parse stored maintenance info, discarding:', e);
        sessionStorage.removeItem('maintenance_info');
      }
    }

    // Then check environment variable for client-side maintenance
    if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
      return {
        isInMaintenance: true,
        estimatedEndTime: import.meta.env.VITE_MAINTENANCE_END_TIME || null,
        message: import.meta.env.VITE_MAINTENANCE_MESSAGE || 'System maintenance in progress'
      };
    }

    // Finally check with API
    try {
      const response = await api.get(API_ENDPOINTS.SYSTEM.MAINTENANCE_STATUS);
      // Only an explicit true means maintenance. A malformed or empty payload
      // must not lock the app out.
      return response.data?.isInMaintenance === true ? response.data : NOT_IN_MAINTENANCE;
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
      // Unreachable API is not maintenance — showing a maintenance page for a
      // network blip is worse than showing the app and letting calls fail.
      return NOT_IN_MAINTENANCE;
    }
  },

  clearMaintenanceInfo(): void {
    sessionStorage.removeItem('maintenance_info');
  }
};
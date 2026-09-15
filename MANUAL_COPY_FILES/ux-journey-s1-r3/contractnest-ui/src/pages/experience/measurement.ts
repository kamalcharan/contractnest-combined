import { analyticsService } from '@/services/analytics/analytics';
import { consentManager } from '@/services/analytics/consent';
import type { ExperiencePerspective, StartAction } from './model';

// Reuse existing analytics only after consent. No contract/customer names,
// amounts, IDs, or new vendor SDKs. An entry click is not a conversion.
export function measureStart(action: StartAction | 'chooser_open', perspective: ExperiencePerspective, isLive: boolean) {
  try {
    if (!consentManager.hasGivenConsent()) return;
    analyticsService.trackEvent('ui_menu_click', {
      menu_item: `experience_${action}`, source: 'experience_start',
      perspective, environment: isLive ? 'live' : 'test',
    });
  } catch { /* Measurement must never block a user action. */ }
}

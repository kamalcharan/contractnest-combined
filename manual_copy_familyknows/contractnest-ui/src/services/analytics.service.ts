// src/services/analytics.service.ts
type EventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Simple analytics service for tracking page views and events
 */
export const analyticsService = {
  /**
   * Track a page view
   * @param path The path of the page
   * @param title The title of the page
   */
  trackPageView(path: string, title: string): void {
    // In a real implementation, this would send data to your analytics provider
    // For now we'll just log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] Page view: ${title} (${path})`);
    }
    
    // Here you would typically call something like:
    // window.gtag('config', 'GA-MEASUREMENT-ID', { page_path: path, page_title: title });
    // or
    // window.amplitude.getInstance().logEvent('PAGE_VIEW', { path, title });
  },

  /**
   * Track a generic event
   * @param eventName The name of the event
   * @param properties Additional properties to track with the event
   */
  trackEvent(eventName: string, properties?: EventProperties): void {
    // In a real implementation, this would send data to your analytics provider
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] Event: ${eventName}`, properties);
    }

    // Here you would typically call something like:
    // window.gtag('event', eventName, properties);
    // or
    // window.amplitude.getInstance().logEvent(eventName, properties);
  },

  /**
   * Track a workspace event
   * @param eventName The name of the event
   * @param properties Additional properties to track with the event
   */
  trackWorkspaceEvent(eventName: string, properties?: EventProperties): void {
    // Delegate to trackEvent for consistency
    this.trackEvent(eventName, properties);
  },

  /**
   * Track MISC page views
   * @param pageType The type of MISC page (e.g., 'no-internet', 'maintenance', etc.)
   * @param pageTitle The title of the page
   * @param properties Additional properties to track
   */
  trackMiscPageView(pageType: string, pageTitle: string, properties?: EventProperties): void {
    // In a real implementation, this would send data to your analytics provider
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] MISC Page view: ${pageTitle} (${pageType})`, properties);
    }
    
    // Here you would typically call something like:
    // if (window.gtag) {
    //   window.gtag('event', 'misc_page_view', {
    //     page_type: pageType,
    //     page_title: pageTitle,
    //     ...properties
    //   });
    // }
    // or
    // window.amplitude.getInstance().logEvent('MISC_PAGE_VIEW', { pageType, pageTitle, ...properties });
  },

  /**
   * Track MISC page actions
   * @param pageType The type of MISC page where the action occurred
   * @param action The action that was performed (e.g., 'retry_clicked', 'go_home_clicked')
   * @param properties Additional properties to track
   */
  trackMiscPageAction(pageType: string, action: string, properties?: EventProperties): void {
    // In a real implementation, this would send data to your analytics provider
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] MISC Page action: ${action} on ${pageType}`, properties);
    }
    
    // Here you would typically call something like:
    // if (window.gtag) {
    //   window.gtag('event', 'misc_page_action', {
    //     page_type: pageType,
    //     action_name: action,
    //     ...properties
    //   });
    // }
    // or
    // window.amplitude.getInstance().logEvent('MISC_PAGE_ACTION', { pageType, action, ...properties });
  }
};
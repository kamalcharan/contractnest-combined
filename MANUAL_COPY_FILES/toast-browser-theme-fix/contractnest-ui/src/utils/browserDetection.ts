// src/utils/browserDetection.ts

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
}

/**
 * Detect the current browser and check if it's supported
 * Supported browsers: Chrome, Edge (Chromium-based)
 */
export const detectBrowser = (): BrowserInfo => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = '';
  let isSupported = false;

  // Edge (Chromium-based) - Check first because it also contains "Chrome" in UA
  if (userAgent.includes('Edg/')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = true;
  }
  // Chrome (but not Edge or Opera)
  else if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = true;
  }
  // Firefox
  else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = false;
  }
  // Safari (but not Chrome)
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = false;
  }
  // Opera
  else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browserName = 'Opera';
    const match = userAgent.match(/(?:OPR|Opera)\/(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = false;
  }
  // Internet Explorer
  else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    browserName = 'Internet Explorer';
    const match = userAgent.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/);
    browserVersion = match ? match[1] : '';
    isSupported = false;
  }

  return {
    name: browserName,
    version: browserVersion,
    isSupported
  };
};

/**
 * Check if the current browser is supported
 */
export const isBrowserSupported = (): boolean => {
  const browserInfo = detectBrowser();
  return browserInfo.isSupported;
};

/**
 * Get browser download links
 */
export const getBrowserDownloadLinks = () => {
  return {
    chrome: 'https://www.google.com/chrome/',
    edge: 'https://www.microsoft.com/edge'
  };
};

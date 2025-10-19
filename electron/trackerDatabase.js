/**
 * Tracker Database - Known tracking domains
 * This database contains common tracking domains used by analytics,
 * advertising, and data collection services.
 */

const TRACKING_DOMAINS = [
  // Google Analytics & Advertising
  'google-analytics.com',
  'googletagmanager.com',
  'googleadservices.com',
  'googlesyndication.com',
  'doubleclick.net',
  'googletagservices.com',
  'google.com/ads',
  'googleoptimize.com',
  'googletag.com',

  // Facebook
  'facebook.com/tr',
  'facebook.net',
  'fbcdn.net',
  'connect.facebook.net',
  'facebook.com/plugins',

  // Twitter/X
  'twitter.com/i/adsct',
  'ads-twitter.com',
  't.co',

  // Amazon
  'amazon-adsystem.com',
  'amazo',

  // Microsoft/Bing
  'bing.com/api/ping',
  'bat.bing.com',
  'clarity.ms',

  // Adobe
  'omtrdc.net',
  'demdex.net',
  'everesttech.net',
  'omniture.com',
  '2o7.net',

  // Other Major Trackers
  'hotjar.com',
  'mouseflow.com',
  'crazyegg.com',
  'mixpanel.com',
  'segment.com',
  'segment.io',
  'amplitude.com',
  'heap.io',
  'fullstory.com',
  'logrocket.com',
  'sentry.io',
  'bugsnag.com',

  // Ad Networks
  'adnxs.com',
  'advertising.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'media.net',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'indexexchange.com',
  'smartadserver.com',
  'quantserve.com',
  'scorecardresearch.com',
  'adform.net',
  'bidswitch.net',
  'adsrvr.org',
  'mathtag.com',
  'bluekai.com',
  'krxd.net',
  'exelator.com',
  'lijit.com',
  'casalemedia.com',
  'turn.com',
  'adtech.de',
  'advertising.com',
  'contextweb.com',

  // Analytics Platforms
  'newrelic.com',
  'nr-data.net',
  'chartbeat.com',
  'chartbeat.net',
  'parsely.com',
  'piwik.pro',
  'statcounter.com',
  'clicky.com',
  'woopra.com',

  // Social Media Widgets
  'linkedin.com/px',
  'pinterest.com/ct',
  'snapchat.com/p',
  'tiktok.com/i18n/pixel',
  'reddit.com/api',

  // CDNs with Tracking
  'cloudflareinsights.com',

  // Heatmap & Session Recording
  'luckyorange.com',
  'inspectlet.com',
  'clicktale.net',
  'sessioncam.com',
  'contentsquare.net',

  // Attribution & Conversion Tracking
  'branch.io',
  'app.link',
  'adjust.com',
  'kochava.com',
  'appsflyer.com',

  // Other Trackers
  'yandex.ru/metrika',
  'mc.yandex.ru'
];

/**
 * Check if a domain is a known tracking domain
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if it's a tracking domain
 */
function isTrackingDomain(domain) {
  if (!domain) return false;

  const lowerDomain = domain.toLowerCase();

  return TRACKING_DOMAINS.some(tracker => {
    // Check for exact match or subdomain match
    return lowerDomain === tracker ||
           lowerDomain.endsWith('.' + tracker) ||
           lowerDomain.includes(tracker);
  });
}

/**
 * Get tracker category for a domain
 * @param {string} domain - Domain to categorize
 * @returns {string} - Category name
 */
function getTrackerCategory(domain) {
  if (!domain) return 'Unknown';

  const lowerDomain = domain.toLowerCase();

  if (lowerDomain.includes('google') || lowerDomain.includes('doubleclick')) {
    return 'Google Analytics/Ads';
  } else if (lowerDomain.includes('facebook') || lowerDomain.includes('fbcdn')) {
    return 'Facebook';
  } else if (lowerDomain.includes('twitter') || lowerDomain.includes('ads-twitter')) {
    return 'Twitter/X';
  } else if (lowerDomain.includes('amazon')) {
    return 'Amazon';
  } else if (lowerDomain.includes('microsoft') || lowerDomain.includes('bing') || lowerDomain.includes('clarity')) {
    return 'Microsoft';
  } else if (lowerDomain.includes('adobe') || lowerDomain.includes('omtrdc') || lowerDomain.includes('demdex')) {
    return 'Adobe';
  } else if (lowerDomain.includes('hotjar') || lowerDomain.includes('mouseflow') || lowerDomain.includes('crazyegg') || lowerDomain.includes('fullstory')) {
    return 'Session Recording';
  } else if (lowerDomain.includes('mixpanel') || lowerDomain.includes('amplitude') || lowerDomain.includes('heap') || lowerDomain.includes('segment')) {
    return 'Product Analytics';
  } else if (lowerDomain.includes('criteo') || lowerDomain.includes('taboola') || lowerDomain.includes('outbrain')) {
    return 'Ad Network';
  } else if (lowerDomain.includes('newrelic') || lowerDomain.includes('sentry') || lowerDomain.includes('bugsnag')) {
    return 'Performance Monitoring';
  } else {
    return 'Other Tracker';
  }
}

module.exports = {
  TRACKING_DOMAINS,
  isTrackingDomain,
  getTrackerCategory
};

/**
 * Privacy Score Calculator
 * Calculates a privacy score (0-100) based on various factors
 * Higher score = better privacy
 */

/**
 * Calculate privacy score based on browser data analysis
 * @param {Object} analysisData - Analysis data from browserCleaner
 * @returns {Object} - Score and breakdown
 */
function calculatePrivacyScore(analysisData) {
  let score = 100; // Start with perfect score
  const breakdown = {
    trackingCookies: { score: 100, weight: 0.4, impact: 0 },
    totalCookies: { score: 100, weight: 0.25, impact: 0 },
    cacheSize: { score: 100, weight: 0.20, impact: 0 },
    historySize: { score: 100, weight: 0.15, impact: 0 }
  };

  // Extract data
  const trackingCookiesCount = analysisData.trackersFound || 0;
  const totalCookiesCount = analysisData.totalCookies || 0;
  const cacheSize = analysisData.cacheSizeBytes || 0;
  const historyCount = analysisData.historyCount || 0;

  // 1. Tracking Cookies Impact (40% weight)
  // More tracking cookies = lower score
  if (trackingCookiesCount > 0) {
    // Deduct points based on number of tracking cookies
    // 0-10 trackers: 90-100 score
    // 10-50 trackers: 70-90 score
    // 50-100 trackers: 40-70 score
    // 100+ trackers: 0-40 score
    if (trackingCookiesCount <= 10) {
      breakdown.trackingCookies.score = Math.max(90, 100 - trackingCookiesCount);
    } else if (trackingCookiesCount <= 50) {
      breakdown.trackingCookies.score = Math.max(70, 90 - (trackingCookiesCount - 10));
    } else if (trackingCookiesCount <= 100) {
      breakdown.trackingCookies.score = Math.max(40, 70 - (trackingCookiesCount - 50) * 0.6);
    } else {
      breakdown.trackingCookies.score = Math.max(0, 40 - (trackingCookiesCount - 100) * 0.4);
    }
    breakdown.trackingCookies.impact = 100 - breakdown.trackingCookies.score;
  }

  // 2. Total Cookies Impact (25% weight)
  // More cookies = more tracking potential
  if (totalCookiesCount > 0) {
    // 0-50 cookies: 85-100 score
    // 50-200 cookies: 60-85 score
    // 200-500 cookies: 30-60 score
    // 500+ cookies: 0-30 score
    if (totalCookiesCount <= 50) {
      breakdown.totalCookies.score = Math.max(85, 100 - totalCookiesCount * 0.3);
    } else if (totalCookiesCount <= 200) {
      breakdown.totalCookies.score = Math.max(60, 85 - (totalCookiesCount - 50) * 0.17);
    } else if (totalCookiesCount <= 500) {
      breakdown.totalCookies.score = Math.max(30, 60 - (totalCookiesCount - 200) * 0.1);
    } else {
      breakdown.totalCookies.score = Math.max(0, 30 - (totalCookiesCount - 500) * 0.06);
    }
    breakdown.totalCookies.impact = 100 - breakdown.totalCookies.score;
  }

  // 3. Cache Size Impact (20% weight)
  // Larger cache = more stored data
  const cacheSizeMB = cacheSize / (1024 * 1024);
  if (cacheSizeMB > 0) {
    // 0-100MB: 85-100 score
    // 100-500MB: 60-85 score
    // 500-1000MB: 30-60 score
    // 1000+MB: 0-30 score
    if (cacheSizeMB <= 100) {
      breakdown.cacheSize.score = Math.max(85, 100 - cacheSizeMB * 0.15);
    } else if (cacheSizeMB <= 500) {
      breakdown.cacheSize.score = Math.max(60, 85 - (cacheSizeMB - 100) * 0.0625);
    } else if (cacheSizeMB <= 1000) {
      breakdown.cacheSize.score = Math.max(30, 60 - (cacheSizeMB - 500) * 0.06);
    } else {
      breakdown.cacheSize.score = Math.max(0, 30 - (cacheSizeMB - 1000) * 0.03);
    }
    breakdown.cacheSize.impact = 100 - breakdown.cacheSize.score;
  }

  // 4. History Size Impact (15% weight)
  // More history = more tracking over time
  if (historyCount > 0) {
    // 0-100 items: 85-100 score
    // 100-500 items: 60-85 score
    // 500-2000 items: 30-60 score
    // 2000+ items: 0-30 score
    if (historyCount <= 100) {
      breakdown.historySize.score = Math.max(85, 100 - historyCount * 0.15);
    } else if (historyCount <= 500) {
      breakdown.historySize.score = Math.max(60, 85 - (historyCount - 100) * 0.0625);
    } else if (historyCount <= 2000) {
      breakdown.historySize.score = Math.max(30, 60 - (historyCount - 500) * 0.02);
    } else {
      breakdown.historySize.score = Math.max(0, 30 - (historyCount - 2000) * 0.015);
    }
    breakdown.historySize.impact = 100 - breakdown.historySize.score;
  }

  // Calculate weighted final score
  const finalScore = Math.round(
    breakdown.trackingCookies.score * breakdown.trackingCookies.weight +
    breakdown.totalCookies.score * breakdown.totalCookies.weight +
    breakdown.cacheSize.score * breakdown.cacheSize.weight +
    breakdown.historySize.score * breakdown.historySize.weight
  );

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    grade: getPrivacyGrade(finalScore),
    color: getScoreColor(finalScore),
    breakdown: breakdown,
    stats: {
      trackingCookiesCount,
      totalCookiesCount,
      cacheSizeMB: Math.round(cacheSizeMB * 10) / 10,
      historyCount
    }
  };
}

/**
 * Get letter grade for privacy score
 * @param {number} score - Privacy score (0-100)
 * @returns {string} - Letter grade
 */
function getPrivacyGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get color code for privacy score
 * @param {number} score - Privacy score (0-100)
 * @returns {string} - Color name
 */
function getScoreColor(score) {
  if (score >= 71) return 'excellent'; // Green
  if (score >= 41) return 'fair';      // Yellow
  return 'poor';                       // Red
}

/**
 * Get description for privacy score
 * @param {number} score - Privacy score (0-100)
 * @returns {string} - Description
 */
function getScoreDescription(score) {
  if (score >= 90) {
    return 'Excellent! Your browser has minimal tracking data.';
  } else if (score >= 80) {
    return 'Very Good! Low amount of tracking data detected.';
  } else if (score >= 70) {
    return 'Good. Some tracking data present but manageable.';
  } else if (score >= 60) {
    return 'Fair. Moderate amount of tracking data detected.';
  } else if (score >= 40) {
    return 'Poor. Significant tracking data found.';
  } else {
    return 'Critical! High amount of tracking data detected.';
  }
}

/**
 * Calculate improvement potential after cleaning
 * @param {Object} currentScore - Current privacy score object
 * @param {Array} dataTypesToClean - Array of data types selected for cleaning
 * @returns {Object} - Projected improvement
 */
function calculateImprovementPotential(currentScore, dataTypesToClean) {
  let potentialImprovement = 0;

  // Estimate improvement based on what will be cleaned
  if (dataTypesToClean.includes('cookies')) {
    potentialImprovement += currentScore.breakdown.totalCookies.impact * 0.8; // 80% improvement
    potentialImprovement += currentScore.breakdown.trackingCookies.impact * 0.9; // 90% improvement
  }

  if (dataTypesToClean.includes('cache')) {
    potentialImprovement += currentScore.breakdown.cacheSize.impact * 0.7; // 70% improvement
  }

  if (dataTypesToClean.includes('history')) {
    potentialImprovement += currentScore.breakdown.historySize.impact * 0.75; // 75% improvement
  }

  const projectedScore = Math.min(100, currentScore.score + Math.round(potentialImprovement));

  return {
    currentScore: currentScore.score,
    projectedScore: projectedScore,
    improvement: projectedScore - currentScore.score,
    projectedGrade: getPrivacyGrade(projectedScore),
    projectedColor: getScoreColor(projectedScore)
  };
}

module.exports = {
  calculatePrivacyScore,
  getPrivacyGrade,
  getScoreColor,
  getScoreDescription,
  calculateImprovementPotential
};

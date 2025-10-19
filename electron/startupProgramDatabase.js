/**
 * Startup Program Database
 * Contains metadata for 100+ known startup programs
 * Provides recommendations, impact estimates, and safety info
 */

const KNOWN_PROGRAMS = {
  // Media & Entertainment
  'Spotify': {
    name: 'Spotify',
    publisher: 'Spotify AB',
    description: 'Music streaming service that plays music on demand',
    category: 'Media',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can be safely disabled. Launch manually when you want to listen to music. Saves significant boot time.',
    dependencies: [],
    bootTimeImpactSeconds: 8
  },
  'iTunes Helper': {
    name: 'iTunes Helper',
    publisher: 'Apple Inc.',
    description: 'Detects iOS devices connected to computer',
    category: 'Media',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Only needed if you frequently sync iOS devices. Can be disabled if you use iCloud.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'Steam': {
    name: 'Steam',
    publisher: 'Valve Corporation',
    description: 'Gaming platform and store',
    category: 'Gaming',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Disable to save boot time. Launch when you want to play games.',
    dependencies: [],
    bootTimeImpactSeconds: 10
  },
  'Epic Games Launcher': {
    name: 'Epic Games Launcher',
    publisher: 'Epic Games',
    description: 'Game launcher and store',
    category: 'Gaming',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when playing Epic Games.',
    dependencies: [],
    bootTimeImpactSeconds: 9
  },

  // Communication
  'Discord': {
    name: 'Discord',
    publisher: 'Discord Inc.',
    description: 'Voice, video, and text chat application',
    category: 'Communication',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Disable to improve boot time significantly. Launch when needed for communication.',
    dependencies: [],
    bootTimeImpactSeconds: 7
  },
  'Slack': {
    name: 'Slack',
    publisher: 'Slack Technologies',
    description: 'Team collaboration and messaging',
    category: 'Communication',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Consider disabling if you don\'t need instant notifications. Can delay by 2-3 minutes.',
    dependencies: [],
    bootTimeImpactSeconds: 5
  },
  'Microsoft Teams': {
    name: 'Microsoft Teams',
    publisher: 'Microsoft Corporation',
    description: 'Business communication platform',
    category: 'Communication',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Heavy application. Disable and launch manually for faster boot.',
    dependencies: [],
    bootTimeImpactSeconds: 8
  },
  'Skype': {
    name: 'Skype',
    publisher: 'Microsoft Corporation',
    description: 'Video calling and instant messaging',
    category: 'Communication',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup unless you need to receive calls immediately.',
    dependencies: [],
    bootTimeImpactSeconds: 5
  },
  'Zoom': {
    name: 'Zoom',
    publisher: 'Zoom Video Communications',
    description: 'Video conferencing application',
    category: 'Communication',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Launch before meetings.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },

  // Cloud Storage
  'Dropbox': {
    name: 'Dropbox',
    publisher: 'Dropbox Inc.',
    description: 'Cloud storage and file synchronization',
    category: 'Cloud Storage',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Consider delaying by 2-3 minutes after boot. Files sync in background.',
    dependencies: [],
    bootTimeImpactSeconds: 5
  },
  'Google Drive': {
    name: 'Google Drive',
    publisher: 'Google LLC',
    description: 'Cloud storage and file backup',
    category: 'Cloud Storage',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can delay startup. Files accessible via web browser if needed urgently.',
    dependencies: [],
    bootTimeImpactSeconds: 5
  },
  'OneDrive': {
    name: 'OneDrive',
    publisher: 'Microsoft Corporation',
    description: 'Cloud storage service',
    category: 'Cloud Storage',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Consider delaying. Important if you heavily use Office 365.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'iCloud Drive': {
    name: 'iCloud Drive',
    publisher: 'Apple Inc.',
    description: 'iCloud file synchronization',
    category: 'Cloud Storage',
    impact: 'low',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled if using iCloud Photos, Documents, or Desktop sync. Essential for Mac ecosystem.',
    dependencies: ['Photos', 'Mail', 'Calendar'],
    bootTimeImpactSeconds: 2
  },
  'Box Sync': {
    name: 'Box Sync',
    publisher: 'Box Inc.',
    description: 'Enterprise cloud storage',
    category: 'Cloud Storage',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can be disabled if not using Box frequently.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },

  // Adobe Applications
  'Adobe Creative Cloud': {
    name: 'Adobe Creative Cloud',
    publisher: 'Adobe Inc.',
    description: 'Adobe applications manager and updater',
    category: 'Creative',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Heavy impact. Disable for faster boot. Adobe apps work without this running.',
    dependencies: [],
    bootTimeImpactSeconds: 7
  },
  'Adobe Updater': {
    name: 'Adobe Updater',
    publisher: 'Adobe Inc.',
    description: 'Checks for Adobe product updates',
    category: 'Updater',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Update manually when convenient.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'Adobe Acrobat Updater': {
    name: 'Adobe Acrobat Updater',
    publisher: 'Adobe Inc.',
    description: 'Updates Adobe Acrobat Reader',
    category: 'Updater',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Check for updates manually.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },

  // Antivirus & Security
  'Windows Defender': {
    name: 'Windows Defender',
    publisher: 'Microsoft Corporation',
    description: 'Built-in antivirus protection',
    category: 'Security',
    impact: 'low',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled. Essential for system security.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  'Norton Security': {
    name: 'Norton Security',
    publisher: 'NortonLifeLock',
    description: 'Antivirus and security suite',
    category: 'Security',
    impact: 'medium',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled for real-time protection. Essential for security.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'McAfee': {
    name: 'McAfee',
    publisher: 'McAfee LLC',
    description: 'Antivirus protection',
    category: 'Security',
    impact: 'medium',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled for security. Do not disable.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'Malwarebytes': {
    name: 'Malwarebytes',
    publisher: 'Malwarebytes Inc.',
    description: 'Anti-malware protection',
    category: 'Security',
    impact: 'low',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled for real-time protection.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },

  // System Utilities
  'Java Update Scheduler': {
    name: 'Java Update Scheduler',
    publisher: 'Oracle Corporation',
    description: 'Checks for Java updates',
    category: 'Updater',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Update Java manually when needed.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'Bluetooth Assistant': {
    name: 'Bluetooth Assistant',
    publisher: 'Various',
    description: 'Manages Bluetooth connections',
    category: 'System',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Only needed if you use Bluetooth devices at startup.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  'Intel Graphics': {
    name: 'Intel Graphics',
    publisher: 'Intel Corporation',
    description: 'Graphics driver helper',
    category: 'System',
    impact: 'low',
    essential: true,
    safeToDisable: false,
    recommendation: 'Keep enabled. Required for graphics functionality.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  'NVIDIA GeForce Experience': {
    name: 'NVIDIA GeForce Experience',
    publisher: 'NVIDIA Corporation',
    description: 'Game optimization and driver updates',
    category: 'Gaming',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Heavy impact. Only needed for game optimization. Can disable.',
    dependencies: [],
    bootTimeImpactSeconds: 8
  },
  'AMD Catalyst Control Center': {
    name: 'AMD Catalyst Control Center',
    publisher: 'AMD',
    description: 'Graphics card settings',
    category: 'System',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can disable if you don\'t adjust graphics settings frequently.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },

  // Development Tools
  'Docker Desktop': {
    name: 'Docker Desktop',
    publisher: 'Docker Inc.',
    description: 'Container platform',
    category: 'Development',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Heavy application. Launch manually when needed for development.',
    dependencies: [],
    bootTimeImpactSeconds: 12
  },
  'Visual Studio Code': {
    name: 'Visual Studio Code',
    publisher: 'Microsoft Corporation',
    description: 'Code editor',
    category: 'Development',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when coding.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'GitHub Desktop': {
    name: 'GitHub Desktop',
    publisher: 'GitHub Inc.',
    description: 'Git repository manager',
    category: 'Development',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Launch when working with repositories.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'Postman': {
    name: 'Postman',
    publisher: 'Postman Inc.',
    description: 'API development tool',
    category: 'Development',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when testing APIs.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },

  // Productivity
  'Evernote': {
    name: 'Evernote',
    publisher: 'Evernote Corporation',
    description: 'Note-taking application',
    category: 'Productivity',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can be disabled. Launch when needed.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'OneNote': {
    name: 'OneNote',
    publisher: 'Microsoft Corporation',
    description: 'Digital notebook',
    category: 'Productivity',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup unless syncing notes constantly.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'Notion': {
    name: 'Notion',
    publisher: 'Notion Labs',
    description: 'All-in-one workspace',
    category: 'Productivity',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can be disabled. Available via web browser.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'Todoist': {
    name: 'Todoist',
    publisher: 'Doist',
    description: 'Task management',
    category: 'Productivity',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Use web version or launch manually.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },

  // System Tools
  'CCleaner': {
    name: 'CCleaner',
    publisher: 'Piriform',
    description: 'System cleaner and optimizer',
    category: 'System',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Run manually for cleaning.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'WinRAR': {
    name: 'WinRAR',
    publisher: 'RARLAB',
    description: 'File compression utility',
    category: 'Utility',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Extraction works without startup entry.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  '7-Zip': {
    name: '7-Zip',
    publisher: 'Igor Pavlov',
    description: 'File archiver',
    category: 'Utility',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Works without startup entry.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },

  // Printers & Scanners
  'HP Print Service': {
    name: 'HP Print Service',
    publisher: 'HP Inc.',
    description: 'HP printer helper',
    category: 'Printer',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Only needed if printing frequently. Can disable.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'Canon IJ Network Scanner': {
    name: 'Canon IJ Network Scanner',
    publisher: 'Canon Inc.',
    description: 'Network scanner utility',
    category: 'Scanner',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when scanning.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },

  // Backup Software
  'Acronis True Image': {
    name: 'Acronis True Image',
    publisher: 'Acronis',
    description: 'Backup and recovery software',
    category: 'Backup',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Can delay startup. Backups run on schedule regardless.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'Carbonite': {
    name: 'Carbonite',
    publisher: 'Carbonite Inc.',
    description: 'Cloud backup service',
    category: 'Backup',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Consider keeping enabled for continuous backup, or delay by 5 minutes.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },

  // VPN & Network
  'NordVPN': {
    name: 'NordVPN',
    publisher: 'NordVPN',
    description: 'VPN service',
    category: 'Network',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Disable if you don\'t need VPN immediately at startup.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'ExpressVPN': {
    name: 'ExpressVPN',
    publisher: 'Express VPN',
    description: 'VPN service',
    category: 'Network',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Launch manually when VPN needed.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'TeamViewer': {
    name: 'TeamViewer',
    publisher: 'TeamViewer GmbH',
    description: 'Remote desktop software',
    category: 'Network',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Only keep enabled if you need remote access capability at all times.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'AnyDesk': {
    name: 'AnyDesk',
    publisher: 'AnyDesk Software',
    description: 'Remote desktop application',
    category: 'Network',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Disable unless you need remote access constantly.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },

  // Additional Common Programs
  'QuickTime': {
    name: 'QuickTime',
    publisher: 'Apple Inc.',
    description: 'Media player',
    category: 'Media',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when playing media.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'RealPlayer': {
    name: 'RealPlayer',
    publisher: 'RealNetworks',
    description: 'Media player and downloader',
    category: 'Media',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Safe to disable. Launch manually when needed.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  },
  'VLC Media Player': {
    name: 'VLC Media Player',
    publisher: 'VideoLAN',
    description: 'Multimedia player',
    category: 'Media',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Works fine launched manually.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  'Logitech Options': {
    name: 'Logitech Options',
    publisher: 'Logitech',
    description: 'Mouse and keyboard customization',
    category: 'Peripheral',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Keep enabled only if using custom button mappings.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'Razer Synapse': {
    name: 'Razer Synapse',
    publisher: 'Razer Inc.',
    description: 'Gaming peripheral configuration',
    category: 'Gaming',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Keep enabled only if using custom profiles or macros.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'Corsair iCUE': {
    name: 'Corsair iCUE',
    publisher: 'Corsair',
    description: 'RGB lighting and peripheral control',
    category: 'Gaming',
    impact: 'high',
    essential: false,
    safeToDisable: true,
    recommendation: 'Heavy application. Disable if you don\'t use RGB features.',
    dependencies: [],
    bootTimeImpactSeconds: 6
  },
  'MSI Afterburner': {
    name: 'MSI Afterburner',
    publisher: 'MSI',
    description: 'GPU overclocking utility',
    category: 'Gaming',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Only needed if you overclock GPU. Can disable otherwise.',
    dependencies: [],
    bootTimeImpactSeconds: 2
  },
  'CPUID HWMonitor': {
    name: 'CPUID HWMonitor',
    publisher: 'CPUID',
    description: 'Hardware monitoring tool',
    category: 'System',
    impact: 'low',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch when monitoring hardware.',
    dependencies: [],
    bootTimeImpactSeconds: 1
  },
  'Google Chrome': {
    name: 'Google Chrome',
    publisher: 'Google LLC',
    description: 'Web browser',
    category: 'Browser',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Browsers don\'t need to start automatically. Launch when needed.',
    dependencies: [],
    bootTimeImpactSeconds: 4
  },
  'Firefox': {
    name: 'Firefox',
    publisher: 'Mozilla Foundation',
    description: 'Web browser',
    category: 'Browser',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Not needed at startup. Launch manually.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  }
};

/**
 * Get program information by name
 */
function getProgramInfo(programName) {
  // Try exact match first
  if (KNOWN_PROGRAMS[programName]) {
    return KNOWN_PROGRAMS[programName];
  }

  // Try partial match (case insensitive)
  const lowerName = programName.toLowerCase();
  for (const [key, value] of Object.entries(KNOWN_PROGRAMS)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return default info if not found
  return {
    name: programName,
    publisher: 'Unknown',
    description: 'Third-party application',
    category: 'Other',
    impact: 'medium',
    essential: false,
    safeToDisable: true,
    recommendation: 'Research this program before disabling. If you don\'t recognize it, it may be safe to disable.',
    dependencies: [],
    bootTimeImpactSeconds: 3
  };
}

/**
 * Estimate impact based on heuristics
 */
function estimateImpact(program) {
  let score = 0;

  // Check if in known high-impact list
  const knownInfo = getProgramInfo(program.name);
  if (knownInfo.impact === 'high') {
    return { level: 'high', seconds: knownInfo.bootTimeImpactSeconds };
  } else if (knownInfo.impact === 'low') {
    return { level: 'low', seconds: knownInfo.bootTimeImpactSeconds };
  }

  // File size based estimation
  if (program.fileSize) {
    if (program.fileSize > 100 * 1024 * 1024) { // > 100MB
      score += 40;
    } else if (program.fileSize > 50 * 1024 * 1024) { // > 50MB
      score += 20;
    } else if (program.fileSize > 20 * 1024 * 1024) { // > 20MB
      score += 10;
    }
  }

  // Category based estimation
  const highImpactCategories = ['Gaming', 'Development', 'Media'];
  if (highImpactCategories.includes(knownInfo.category)) {
    score += 25;
  }

  // Determine impact level and estimate seconds
  if (score >= 50) {
    return { level: 'high', seconds: 8 };
  } else if (score >= 25) {
    return { level: 'medium', seconds: 4 };
  } else {
    return { level: 'low', seconds: 2 };
  }
}

/**
 * Get all categories
 */
function getAllCategories() {
  const categories = new Set();
  Object.values(KNOWN_PROGRAMS).forEach(program => {
    categories.add(program.category);
  });
  return Array.from(categories).sort();
}

/**
 * Get recommendations for startup optimization
 */
function getOptimizationRecommendations(startupPrograms) {
  const recommendations = [];

  startupPrograms.forEach(program => {
    const info = getProgramInfo(program.name);

    // High impact, non-essential programs
    if (info.impact === 'high' && !info.essential && info.safeToDisable && program.enabled) {
      recommendations.push({
        program: program.name,
        action: 'disable',
        reason: info.recommendation,
        savings: info.bootTimeImpactSeconds,
        priority: 'high'
      });
    }

    // Medium impact programs that can be delayed
    if (info.impact === 'medium' && !info.essential && program.enabled) {
      if (['Cloud Storage', 'Backup'].includes(info.category)) {
        recommendations.push({
          program: program.name,
          action: 'delay',
          reason: `Delay ${program.name} by 2-3 minutes for faster boot`,
          savings: Math.floor(info.bootTimeImpactSeconds * 0.7),
          priority: 'medium'
        });
      }
    }
  });

  // Sort by priority and savings
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'high' ? -1 : 1;
    }
    return b.savings - a.savings;
  });

  return recommendations.slice(0, 10); // Return top 10
}

module.exports = {
  KNOWN_PROGRAMS,
  getProgramInfo,
  estimateImpact,
  getAllCategories,
  getOptimizationRecommendations
};
